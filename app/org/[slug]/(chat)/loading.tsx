import { Loader } from "@/components/ai-elements/loader";

export default function Loading() {
  return (
    <div className="flex h-dvh items-center justify-center">
      <Loader size={24} />
    </div>
  );
}

