import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from utils.database import get_db_connection, return_db_connection

app = FastAPI()

# Add CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    """WebSocket endpoint to stream race data from PostgreSQL."""
    await websocket.accept()
    last_seen_id = 0
    
    try:
        while True:
            try:
                # Get database connection from pool
                conn = get_db_connection()
                cursor = conn.cursor()
                
                # Query for new rows where id > last_seen_id
                query = "SELECT id, payload FROM race_data WHERE id > %s ORDER BY id ASC"
                cursor.execute(query, (last_seen_id,))
                rows = cursor.fetchall()
                
                if rows:
                    # Process new rows
                    for row in rows:
                        row_id, payload = row
                        try:
                            # Parse payload if it's a string, otherwise use as-is
                            if isinstance(payload, str):
                                payload_data = json.loads(payload)
                            else:
                                payload_data = payload
                            
                            # Send JSON payload to client
                            await websocket.send_json(payload_data)
                            
                            # Update last_seen_id to the highest ID seen
                            last_seen_id = max(last_seen_id, row_id)
                        except json.JSONDecodeError as e:
                            print(f"Error parsing JSON payload for row {row_id}: {e}")
                        except Exception as e:
                            print(f"Error sending data for row {row_id}: {e}")
                
                # Close cursor and return connection to pool
                cursor.close()
                return_db_connection(conn)
                
                # If no new rows, sleep briefly to prevent high CPU usage
                if not rows:
                    await asyncio.sleep(0.1)
                    
            except Exception as e:
                print(f"Database error: {e}")
                # Try to return connection to pool if it exists
                try:
                    if 'cursor' in locals():
                        cursor.close()
                    if 'conn' in locals():
                        return_db_connection(conn)
                except:
                    pass
                # Wait before retrying
                await asyncio.sleep(1)
                
            except WebSocketDisconnect:
                print("Client disconnected")
                break
                
            except Exception as e:
                print(f"Unexpected error: {e}")
                # Wait before retrying
                await asyncio.sleep(1)
                
    except WebSocketDisconnect:
        print("WebSocket connection closed")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # Ensure connection is returned to pool
        try:
            if 'conn' in locals():
                return_db_connection(conn)
        except:
            pass


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "Race Telemetry API", "status": "running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

