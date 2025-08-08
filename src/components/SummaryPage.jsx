import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import VIDEO_URLS from "../data/videoMap";
import highlights from "../data/highlights";

/**
 * Highlight selected keywords inside a paragraph.
 */
function highlightWordsInText(text, wordsToHighlight) {
  if (!wordsToHighlight || wordsToHighlight.length === 0) return text;

  // Sort longer words first to avoid substring conflicts
  const sortedWords = [...wordsToHighlight].sort((a, b) => b.length - a.length);
  const regex = new RegExp(`\\b(${sortedWords.join("|")})\\b`, "gi");

  const parts = text.split(regex);
  return parts.map((part, i) =>
    sortedWords.some((w) => w.toLowerCase() === part.toLowerCase()) ? (
      <span key={i} className="text-blue-900 font-medium">
        {part}
      </span>
    ) : (
      part
    )
  );
}

/**
 * Summary comparison page.
 */
export default function SummaryPage() {
  // ---- ENV & ROUTER ---------------------------------------------------
  const base = import.meta.env.VITE_BACKEND_URL || ""; // e.g. "https://my-backend.fly.dev"
  const { userId } = useParams();
  const navigate = useNavigate();

  // ---- STATE ----------------------------------------------------------
  const [summaries, setSummaries] = useState([]);
  const [manualUserId, setManualUserId] = useState("");
  const [nextEnabled, setNextEnabled] = useState(false);
  const [playLongVideo, setPlayLongVideo] = useState(false);
  const [videoSrcs, setVideoSrcs] = useState({ short: "", long: "" });

  // ---- DERIVED --------------------------------------------------------
  const userNum = parseInt(userId.replace("user", ""), 10);
  const prevUserId = `user${String(Math.max(userNum - 1, 1)).padStart(2, "0")}`;
  const nextUserId = `user${String(userNum + 1).padStart(2, "0")}`;
  const isLastUser = userNum === 10;
  const nextPath = isLastUser ? "/complete" : `/user/${nextUserId}`;
  const nextLabel = isLastUser ? "Finish" : "Next Page";

  // ---- SIDE‑EFFECTS ---------------------------------------------------
  useEffect(() => setNextEnabled(false), [userId]);

  useEffect(() => {
    async function fetchUserData() {
      // 1. video urls ----------------------------------------------------
      const shortVideo = VIDEO_URLS[userId]?.short || "";
      const longVideo = VIDEO_URLS[userId]?.long || "";
      setVideoSrcs({ short: shortVideo, long: longVideo });

      // 2. fetch summary order from backend -----------------------------
      let order = [];
      try {
        // Prefer absolute URL if VITE_BACKEND_URL is provided, else relative.
        const resp = await fetch(`${base}/api/order/${userId}`);
        if (resp.ok) {
          const data = await resp.json();
          order = data.order ?? [];
        }
      } catch (err) {
        console.warn("Failed to fetch order from backend, will shuffle locally.", err);
      }

      // 3. fallback shuffle if backend fails ---------------------------
      if (order.length === 0) {
        const fallback = ["llama", "gama", "human"];
        order = fallback
          .map((src) => ({ src, sort: Math.random() }))
          .sort((a, b) => a.sort - b.sort)
          .map((o, i) => ({ label: String.fromCharCode(65 + i), source: o.src }));
      }

      // 4. fetch each summary text -------------------------------------
      const texts = await Promise.all(
        order.map((o) =>
          fetch(`/user_data/${userId}/${o.source}.txt`).then((res) => res.text())
        )
      );

      // 5. combine order + text ----------------------------------------
      const orderedSummaries = order.map((o, idx) => ({
        label: o.label,
        source: o.source,
        text: texts[idx] || "",
      }));

      setSummaries(orderedSummaries);
    }

    fetchUserData();
  }, [userId, base]);

  // ---- HANDLERS -------------------------------------------------------
  async function handleEvaluation() {
    const confirmed = window.confirm("Are you ready to evaluate these summaries?");
    if (!confirmed) return;

    const mapping = summaries.map((s) => ({ label: s.label, source: s.source, text: s.text }));
    localStorage.setItem(`summary_mapping_${userId}`, JSON.stringify(mapping));

    if (!base) {
      console.error("VITE_BACKEND_URL is not set; cannot save mapping to backend.");
    } else {
      await fetch(`${base}/api/saveMapping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, mapping }),
      });
    }

    window.open(
      "https://docs.google.com/forms/d/e/1FAIpQLSfOCbWD_x5-2YvV5Y93d-c8u3YgWG_rLs5TlJT8kkHPIZUW0A/viewform",
      "_blank"
    );

    setNextEnabled(true);
  }

  // ---- RENDER ---------------------------------------------------------
  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* quick jump */}
      <div className="flex items-center space-x-2">
        <input
          type="text"
          placeholder="Enter user ID (e.g., user03)"
          value={manualUserId}
          onChange={(e) => setManualUserId(e.target.value)}
          className="border rounded-md px-3 py-1 text-sm shadow"
        />
        <button
          onClick={() => {
            if (/^user\d{2}$/.test(manualUserId)) {
              navigate(`/user/${manualUserId}`);
            } else {
              alert("Please enter a valid user ID like user01");
            }
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-1 rounded shadow"
        >
          Go
        </button>
      </div>

      {/* navigation buttons */}
      <div className="flex justify-between items-center w-full px-4">
        <button
          onClick={() => navigate(`/user/${prevUserId}`)}
          disabled={userNum === 1}
          className={`px-4 py-2 rounded-lg font-semibold shadow-md ${
            userNum === 1
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          Previous Page
        </button>

        <button
          onClick={() => navigate(nextPath)}
          disabled={!nextEnabled}
          className={`px-4 py-2 rounded-lg font-semibold shadow-md ${
            nextEnabled
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {nextLabel}
        </button>
      </div>

      {/* video section */}
      <div className="flex flex-col items-center space-y-2">
        <div className="bg-gray-100 px-4 py-2 rounded-2xl text-center font-medium text-lg shadow">
          {playLongVideo ? "Now showing the full video recording" : "Now showing the 2‑minute highlight version for quick viewing"}
        </div>

        <iframe
          src={playLongVideo ? videoSrcs.long : videoSrcs.short}
          allow="autoplay"
          allowFullScreen
          className="w-1/2 max-w-2xl rounded-xl shadow-lg aspect-video"
        />

        <button
          onClick={() => setPlayLongVideo((v) => !v)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-1 px-3 rounded-lg shadow-md"
        >
          {playLongVideo ? "Switch to Short Video" : "Switch to Full Video"}
        </button>
      </div>

      {/* summaries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {summaries.map((item) => (
          <div
            key={item.label}
            className="flex flex-col justify-between border rounded-xl p-4 shadow-md text-sm whitespace-pre-wrap break-words min-h-[300px]"
          >
            <h3 className="font-semibold mb-2 text-gray-700">Summary {item.label}</h3>
            <p className="flex-grow">
              {highlightWordsInText(item.text, highlights[userId]?.[item.source])}
            </p>
          </div>
        ))}
      </div>

      {/* evaluation */}
      <div className="flex justify-center">
        <button
          onClick={handleEvaluation}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md"
        >
          Evaluation
        </button>
      </div>
    </div>
  );
}
