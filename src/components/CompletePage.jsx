export default function CompletePage() {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-6">
        <h1 className="text-3xl font-bold">🎉 All done, thank you!</h1>
        <p className="text-lg text-gray-600">
          Your evaluations have been saved.
        </p>
        <a
          href="https://www.google.com/"         
          className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg shadow"
        >
          Exit
        </a>
      </div>
    );
  }
  