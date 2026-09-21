import { useState } from "react";
import { HiOutlinePlus } from "react-icons/hi";
import CreateProjectForm from "./CreateProjectForm";
import Modal from "./../../ui/Modal";

function ProjectsHeader() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="flex items-center justify-between mb-8">
      <h1 className="font-black text-secondary-700 text-xl">پروژه های شما</h1>
      <Modal
        title="اضافه کردن پروژه جدید"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}>
        <CreateProjectForm onClose={() => setIsOpen(false)} />
      </Modal>
      <button
        onClick={() => setIsOpen(true)}
        className="btn btn--primary flex items-center gap-x-2">
        <HiOutlinePlus />
        <span>اضافه کردن پروژه</span>
      </button>
    </div>
  );
}
export default ProjectsHeader;
