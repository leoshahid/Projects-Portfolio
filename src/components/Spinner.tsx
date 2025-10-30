export default function Spinner({ size = 32 }: { size?: number }) {
  const px = `${size}px`;
  return (
    <div className="grid place-items-center">
      <span
        className="inline-block animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"
        style={{ width: px, height: px }}
        aria-label="Loading"
      />
    </div>
  );
}
