import { FaThumbsUp, FaThumbsDown } from "react-icons/fa";

export default function Rating({ rating, onRate }) {
  return (
    <div className="flex mt-2 space-x-3">
      <button
        onClick={() => onRate("like")}
        className={`p-2 rounded ${
          rating === "like" ? "bg-green-500 text-white" : "bg-gray-200"
        }`}
      >
        <FaThumbsUp />
      </button>
      <button
        onClick={() => onRate("dislike")}
        className={`p-2 rounded ${
          rating === "dislike" ? "bg-red-500 text-white" : "bg-gray-200"
        }`}
      >
        <FaThumbsDown />
      </button>
    </div>
  );
}
