import serial
import json

port_name = 'COM4' # Update with actual serial port name
baud_rate = 9600

try:
    ser = serial.Serial(port_name, baud_rate, timeout=1)
    print(f"Connected to serial port {port_name} at {baud_rate} baud.")
except serial.SerialException as e:
    print(f"Error connecting to serial port: {e}")
    ser = None

def send_serial_data(data):
    json_bytes = json.dumps(data).encode('utf-8')
    if ser and ser.is_open:
        try:
            ser.write(json_bytes + b'\n')
            print(f"Sent data to serial: {data}")
        except serial.SerialException as e:
            print(f"Error writing to serial port: {e}")
    else:
        print("Serial port is not open. Cannot send data.")

def receive_serial_data():
    if ser and ser.is_open:
        try:
            line = ser.readline().decode('utf-8').strip()
            if line:
                print(f"Received data from serial: {line}")
                return json.loads(line)
        except serial.SerialException as e:
            print(f"Error reading from serial port: {e}")
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON from serial data: {e}")
    else:
        print("Serial port is not open. Cannot receive data.")
