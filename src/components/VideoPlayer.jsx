export default function VideoPlayer({ src }) {
  return (
    <div className="w-full flex justify-center">
      <video
        src={src}
        controls
        className="w-2/3 max-w-4xl rounded-xl shadow-lg aspect-video"
      />
    </div>
  );
}
