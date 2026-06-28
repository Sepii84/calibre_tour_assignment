"use client";
import styles from "./page.module.css";
import { useState } from "react";

interface AvailabilityResult {
  roomId: number;
  roomCode: string;
  roomName: string;
  boardTypeCode: string;
  currency: string;
  nightlyPrice: number;
  nights: number;
  totalPrice: number;
}

export default function Home() {
  const [checkIn, setCheckIn] = useState("2026-06-20");
  const [checkOut, setCheckOut] = useState("2026-06-24");
  const [boardType, setBoardType] = useState("BB");
  const [adults, setAdults] = useState("2");
  const [children, setChildren] = useState("0");
  const [results, setResults] = useState<AvailabilityResult[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const params = new URLSearchParams({
    checkIn,
    checkOut,
    boardType,
    adults,
    children,
  });

  setLoading(true);
  setMessage("");
  setHasSearched(false);

  try{
    const response = await fetch(`http://localhost:3001/availability?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      setResults([]);
      setMessage(data.error || "Search failed");
      setHasSearched(true);
      return;
    }
    setResults(data);
    setHasSearched(true); 
  } catch (error) {
    console.error(error);
    setResults([]);
    setMessage("Search failed");
    setHasSearched(true);
  } finally {
    setLoading(false);
  }
}

return (
    <main className={styles.main}>
      <h1>Hotel Room Availability</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label>
          Check-in:
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            required
          />
        </label>
        <label>
          Check-out:
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            required
          />
        </label>
        <label>
          Board Type:
          <select
            value={boardType}
            onChange={(e) => setBoardType(e.target.value)}
            required
          >
            <option value="BB">Bed & Breakfast (BB)</option>
            <option value="HB">Half Board (HB)</option>
          </select>
        </label>
        <label>
          Adults:
          <input
            type="number"
            value={adults}
            onChange={(e) => setAdults(e.target.value)}
            min="1"
            required
          />
        </label>
        <label>
          Children:
          <input
            type="number"
            value={children}
            onChange={(e) => setChildren(e.target.value)}
            min="0"
            required
          />
        </label>
        <button type="submit">Search</button>
      </form>
      {loading && <p>Searching...</p>}
      {message && <p>{message}</p>}
      {hasSearched && !message && results.length === 0 && (
        <p>No available rooms found for the selected criteria.</p>
      )}
      {results.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Room Code</th>
              <th>Room Name</th>
              <th>Board Type</th>
              <th>Currency</th>
              <th>Nightly Price</th>
              <th>Nights</th>
              <th>Total Price</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.roomId}>
                <td>{result.roomCode}</td>
                <td>{result.roomName}</td>
                <td>{result.boardTypeCode}</td>
                <td>{result.currency}</td>
                <td>{result.nightlyPrice.toFixed(2)}</td>
                <td>{result.nights}</td>
                <td>{result.totalPrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}