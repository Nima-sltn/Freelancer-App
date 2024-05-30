export default function ConfirmDelete({
  resourceName,
  disabled,
  onConfirm,
  onClose,
}) {
  return (
    <>
      <h2 className="font-bold text-base mb-8">
        آیا از حذف {resourceName} مطمئن هستید؟
      </h2>
      <div className="flex items-center justify-between gap-x-16">
        <button
          className="btn btn--primary flex-1"
          disabled={disabled}
          onClick={onClose}>
          لغو
        </button>
        <button
          className="btn btn--danger flex-1 py-3"
          disabled={disabled}
          onClick={onConfirm}>
          تایید
        </button>
      </div>
    </>
  );
}
