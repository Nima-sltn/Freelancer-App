import { HiOutlineX } from "react-icons/hi";

function Modal({ isOpen, onClose, title, children }) {
  return (
    isOpen && (
      <div
        className="backdrop-blur-sm fixed top-0 left-0 w-full
       h-screen bg-secondary-800 bg-opacity-30 z-50">
        <div
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
        rounded-lg bg-secondary-0 p-4 shadow-lg transition-all duration-500 ease-out
         w-[calc(100vw-2rem)] md:max-w-sm max-h-[calc(100vh-2rem)] overflow-y-auto
        ">
          <div
            className="flex items-center justify-between 
          border-b border-b-secondary-300 pb-2 mb-6">
            <p className="text-secondary-700 font-bold text-base">{title}</p>
            <button onClick={onClose}>
              <HiOutlineX className="w-5 h-5 text-secondary-500" />
            </button>
          </div>
          {children}
        </div>
      </div>
    )
  );
}

export default Modal;
