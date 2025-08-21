interface SearchResultProps {
  query: string;
}

export default function SearchResult({ query }: SearchResultProps) {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      {query ? (
        <div className="text-gray-700 text-lg">
          Showing results for: <span className="font-semibold">{query}</span>
        </div>
      ) : (
        <div className="text-gray-500 text-lg">Enter something to search...</div>
      )}
    </div>
  );
}
