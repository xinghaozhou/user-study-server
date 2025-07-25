export default function SummaryCard({
  index,
  text,
  selected,
  smallText = false,
}) {
  const active = selected === index;
  const header = `Summary ${String.fromCharCode(65 + index)}`;

  return (
    <div
      className={`flex flex-col border rounded-xl p-4 shadow-md ${
        active ? "border-blue-600 bg-blue-50" : "border-gray-300"
      } ${smallText ? "text-xs leading-snug" : "text-sm"} whitespace-pre-wrap`}
    >
      {/* Header */}
      <h3 className="font-semibold mb-2 text-gray-700">{header}</h3>

      {/* Summary Text */}
      <div className="max-h-72 overflow-auto">
        {text}
      </div>
    </div>
  );
}
