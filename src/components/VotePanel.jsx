export default function VotePanel({ selected, onSubmit }) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-gray-700">
          {selected !== null
            ? `You chose Summary ${String.fromCharCode(65 + selected)}`
            : "Pick a summary first"}
        </span>
        <button
          disabled={selected === null}
          onClick={onSubmit}
          className="rounded-lg bg-green-600 disabled:bg-gray-400 text-white px-4 py-2"
        >
          Submit Vote
        </button>
      </div>
    );
  }
  