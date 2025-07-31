import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import VIDEO_URLS from "../data/videoMap";

export default function SummaryPage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [summaries, setSummaries] = useState([]);
  const [nextEnabled, setNextEnabled] = useState(false);
  const [playLongVideo, setPlayLongVideo] = useState(false);
  const [videoSrcs, setVideoSrcs] = useState({ short: "", long: "" });

  const nextUserId = `user${String(parseInt(userId.replace("user", "")) + 1).padStart(2, "0")}`;

  useEffect(() => {
    async function fetchUserData() {
      // set video srcs
      const userVideos = VIDEO_URLS[userId];
      const shortVideo = VIDEO_URLS[userId]?.short || "";
      const longVideo = VIDEO_URLS[userId]?.long || "";
      setVideoSrcs({ short: shortVideo, long: longVideo });

      const summaryFiles = ["llama.txt", "gama.txt", "human.txt"];
      const results = await Promise.all(
        summaryFiles.map((file) =>
          fetch(`/user_data/${userId}/${file}`).then((res) => res.text())
        )
      );

      const originalSummaries = results.map((text, idx) => ({
        source: summaryFiles[idx].replace(".txt", ""),
        text,
      }));

      const cacheKey = `summary_order_cache_${userId}`;
      const cached = localStorage.getItem(cacheKey);
      const now = Date.now();

      let orderedSummaries;

      if (cached) {
        try {
          const { timestamp, order } = JSON.parse(cached);
          if (now - timestamp < 3600 * 1000 && Array.isArray(order)) {
            orderedSummaries = order.map((label, i) => {
              const source = label.source;
              const original = originalSummaries.find((s) => s.source === source);
              return {
                label: String.fromCharCode(65 + i),
                source,
                text: original?.text || "",
              };
            });
          }
        } catch (e) {
          console.warn("Failed to parse summary order cache.");
        }
      }

      if (!orderedSummaries) {
        const shuffled = originalSummaries
          .map((s) => ({ ...s, sort: Math.random() }))
          .sort((a, b) => a.sort - b.sort);

        orderedSummaries = shuffled.map((s, i) => ({
          label: String.fromCharCode(65 + i),
          source: s.source,
          text: s.text,
        }));

        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            timestamp: now,
            order: orderedSummaries.map((s) => ({ source: s.source })),
          })
        );
      }

      setSummaries(orderedSummaries);
    }

    fetchUserData();
  }, [userId]);

  const handleEvaluation = async () => {
    const confirmed = window.confirm("Are you ready to evaluate these summaries?");
    if (confirmed) {
      const mapping = summaries.map((s) => ({
        label: s.label,
        source: s.source,
        text: s.text,
      }));

      localStorage.setItem(`summary_mapping_${userId}`, JSON.stringify(mapping));

      const base = import.meta.env.VITE_BACKEND_URL || "";
      await fetch(`${base}/api/saveMapping`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId,
          timestamp: new Date().toISOString(),
          mapping
        })
      });      

      window.open(
        "https://docs.google.com/forms/d/e/1FAIpQLSfOCbWD_x5-2YvV5Y93d-c8u3YgWG_rLs5TlJT8kkHPIZUW0A/viewform",
        "_blank"
      );

      setNextEnabled(true);
    }
  };

  return (
    <div className="relative max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* next page */}
      <button
        onClick={() => navigate(`/user/${nextUserId}`)}
        disabled={!nextEnabled}
        className={`absolute top-4 right-4 px-4 py-2 rounded-lg font-semibold shadow-md
          ${nextEnabled
            ? "bg-blue-600 hover:bg-blue-700 text-white"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
      >
        Next Page
      </button>

      {/* video + toggle */}
      <div className="flex justify-center items-start gap-4">
      <iframe
        src={playLongVideo ? videoSrcs.long : videoSrcs.short}
        allow="autoplay"
        allowFullScreen
        className="w-1/2 max-w-2xl rounded-xl shadow-lg aspect-video"
      />

        <button
          onClick={() => setPlayLongVideo(!playLongVideo)}
          className="h-fit mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md"
        >
          {playLongVideo ? "Switch to Short Video" : "Switch to Full Video"}
        </button>
      </div>

      {/* summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {summaries.map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col justify-between border rounded-xl p-4 shadow-md text-sm whitespace-pre-wrap break-words min-h-[300px]"
          >
            <h3 className="font-semibold mb-2 text-gray-700">
              Summary {item.label}
            </h3>
            <p className="flex-grow">{item.text}</p>
          </div>
        ))}
      </div>

      {/* evaluation */}
      <div className="mt-8 flex justify-center">
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
