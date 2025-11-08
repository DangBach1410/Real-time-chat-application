interface ConfirmModalProps {
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ title, message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 
                w-11/12 max-w-md sm:max-w-lg md:max-w-xl">
        {title && <h2 className="text-lg font-semibold mb-2">{title}</h2>}
        <p className="text-gray-700 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
