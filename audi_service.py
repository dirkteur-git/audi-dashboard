import asyncio
import sqlite3
import os
import time
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server', 'audi.db')
SYNC_FLAG = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server', '.sync_requested')
POLL_INTERVAL = 15 * 60  # 15 minuten

# State tracking
last_mileage = None
last_lat = None
last_lon = None
trip_start_km = None
trip_start_lat = None
trip_start_lon = None
trip_start_time = None
is_driving = False


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_setting(key):
    conn = get_db()
    row = conn.execute('SELECT value FROM settings WHERE key = ?', (key,)).fetchone()
    conn.close()
    return row['value'] if row else None


def save_trip(start_time, end_time, start_km, end_km, start_lat, start_lon, end_lat, end_lon):
    distance = end_km - start_km
    if distance <= 0.5:
        print(f"Rit te kort ({distance} km), overgeslagen")
        return

    start_address = reverse_geocode(start_lat, start_lon) if start_lat and start_lon else None
    end_address = reverse_geocode(end_lat, end_lon) if end_lat and end_lon else None

    conn = get_db()
    conn.execute('''
        INSERT INTO trips (start_time, end_time, start_km, end_km, distance,
                          start_lat, start_lon, end_lat, end_lon,
                          start_address, end_address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (start_time, end_time, start_km, end_km, distance,
          start_lat, start_lon, end_lat, end_lon,
          start_address, end_address))
    conn.commit()
    conn.close()
    print(f"Rit opgeslagen: {distance:.1f} km ({start_address} -> {end_address})")


def update_vehicle_status(mileage=None, battery=None, range_km=None, lat=None, lon=None):
    conn = get_db()
    conn.execute('''
        UPDATE vehicle_status SET
            mileage = COALESCE(?, mileage),
            battery_level = COALESCE(?, battery_level),
            range_km = COALESCE(?, range_km),
            latitude = COALESCE(?, latitude),
            longitude = COALESCE(?, longitude),
            last_update = ?
        WHERE id = 1
    ''', (mileage, battery, range_km, lat, lon, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()


def reverse_geocode(lat, lon):
    """Reverse geocode met OpenStreetMap Nominatim"""
    if not lat or not lon:
        return None
    try:
        import urllib.request
        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&zoom=16&addressdetails=1"
        req = urllib.request.Request(url, headers={'User-Agent': 'AudiDashboard/1.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            addr = data.get('address', {})
            parts = []
            if addr.get('road'):
                road = addr['road']
                if addr.get('house_number'):
                    road += ' ' + addr['house_number']
                parts.append(road)
            if addr.get('city') or addr.get('town') or addr.get('village'):
                parts.append(addr.get('city') or addr.get('town') or addr.get('village'))
            return ', '.join(parts) if parts else data.get('display_name', '')[:80]
    except Exception as e:
        print(f"Geocoding fout: {e}")
        return None


def poll_audi():
    global last_mileage, last_lat, last_lon
    global trip_start_km, trip_start_lat, trip_start_lon, trip_start_time, is_driving

    username = get_setting('username')
    password = get_setting('password')
    vin = get_setting('vin')

    if not username or not password or not vin:
        print("MyAudi credentials niet ingesteld, sla poll over")
        return

    try:
        from audiapi.API import API
        from audiapi.Services import LogonService, CarService, CarFinderService
        from audiapi.Services import VehicleStatusReportService, RemoteBatteryChargeService

        # Login
        api = API()
        logon = LogonService(api)
        try:
            logon.restore_token()
        except Exception:
            logon.login(username, password)

        # Haal voertuigen op
        car_service = CarService(api)
        vehicles = car_service.get_vehicles()

        vehicle = None
        for v in vehicles:
            v_vin = getattr(v, 'vin', None) or (v.get('vin') if isinstance(v, dict) else str(v))
            if str(v_vin).upper() == vin.upper():
                vehicle = v
                break

        if not vehicle:
            print(f"Voertuig met VIN {vin} niet gevonden. Beschikbare voertuigen: {vehicles}")
            return

        mileage = None
        battery = None
        range_km = None
        lat = None
        lon = None

        # Voertuig status (km-stand etc)
        try:
            status_service = VehicleStatusReportService(api, vehicle)
            stored = status_service.get_stored_vehicle_data()
            if stored:
                data = stored if isinstance(stored, dict) else json.loads(str(stored)) if hasattr(stored, '__str__') else {}
                # Probeer km-stand te vinden in de response
                if isinstance(data, dict):
                    for key in ['mileage', 'odometer', 'distanceCovered']:
                        if key in data:
                            mileage = float(data[key])
                            break
                    # Zoek in nested data
                    fields = data.get('vehicleDataDetail', data.get('StoredVehicleDataResponse', {}))
                    if isinstance(fields, dict):
                        for key in ['mileage', 'odometer']:
                            if key in fields:
                                mileage = float(fields[key])
                                break
        except Exception as e:
            print(f"Status ophalen fout: {e}")

        # EV batterij status
        try:
            battery_service = RemoteBatteryChargeService(api, vehicle)
            batt_status = battery_service.get_status()
            if batt_status:
                data = batt_status if isinstance(batt_status, dict) else {}
                battery = data.get('battery_level', data.get('currentSOC_pct'))
                range_km = data.get('range', data.get('cruisingRangeElectric_km'))
                if battery is not None:
                    battery = float(battery)
                if range_km is not None:
                    range_km = float(range_km)
        except Exception as e:
            print(f"Batterij status fout: {e}")

        # GPS positie
        try:
            finder = CarFinderService(api, vehicle)
            pos = finder.find()
            if pos:
                data = pos if isinstance(pos, dict) else {}
                lat = data.get('latitude', data.get('lat'))
                lon = data.get('longitude', data.get('lng', data.get('lon')))
                if lat is not None:
                    lat = float(lat)
                if lon is not None:
                    lon = float(lon)
        except Exception as e:
            print(f"GPS positie fout: {e}")

        # Update vehicle status in database
        update_vehicle_status(
            mileage=mileage,
            battery=battery,
            range_km=range_km,
            lat=lat,
            lon=lon
        )

        print(f"Audi status: {mileage} km, batterij {battery}%, bereik {range_km} km, GPS: {lat},{lon}")

        # Rit detectie op basis van km-stand verandering
        if last_mileage is not None and mileage is not None:
            km_delta = mileage - last_mileage

            if km_delta > 0.5 and not is_driving:
                is_driving = True
                trip_start_km = last_mileage
                trip_start_lat = last_lat
                trip_start_lon = last_lon
                trip_start_time = datetime.utcnow().isoformat()
                print(f"Rit gestart bij {trip_start_km} km")

            elif km_delta == 0 and is_driving:
                is_driving = False
                save_trip(
                    trip_start_time,
                    datetime.utcnow().isoformat(),
                    trip_start_km,
                    mileage,
                    trip_start_lat, trip_start_lon,
                    lat, lon
                )

        last_mileage = mileage
        last_lat = lat
        last_lon = lon

    except ImportError as e:
        print(f"audiapi niet geinstalleerd: {e}. Installeer met: pip install audiapi")
    except Exception as e:
        print(f"Audi API fout: {e}")


def main():
    print("Audi service gestart...")

    while True:
        # Check voor handmatige sync
        if os.path.exists(SYNC_FLAG):
            print("Handmatige sync aangevraagd")
            try:
                os.remove(SYNC_FLAG)
            except FileNotFoundError:
                pass

        poll_audi()
        time.sleep(POLL_INTERVAL)


if __name__ == '__main__':
    main()
