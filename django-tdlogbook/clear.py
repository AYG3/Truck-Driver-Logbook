import sqlite3

# Connect to the SQLite database
conn = sqlite3.connect('db.sqlite3')
cursor = conn.cursor()

# SQL expression to clear the duty_segments table
# cursor.execute("DELETE FROM trips")
cursor.execute("INSERT INTO drivers (id, name, cycle_type, created_at) VALUES (1, 'John Doe', '70 hours / 8 days', datetime('now'))")

# Commit the changes and close the connection
conn.commit()
conn.close()