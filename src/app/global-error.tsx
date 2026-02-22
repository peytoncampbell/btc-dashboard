"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body className="bg-black text-white flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
          <button onClick={() => reset()} className="px-4 py-2 bg-blue-600 rounded">Try again</button>
        </div>
      </body>
    </html>
  );
}
