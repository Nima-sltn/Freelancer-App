import {
  HiCollection,
  HiHome,
  HiOutlineViewGrid,
  HiUser,
} from "react-icons/hi";
import AppLayout from "../../ui/AppLayout";
import CustomNavlink from "../../ui/CustomNavLink";
import Sidebar from "../../ui/Sidebar";

function AdminLayout() {
  return (
    <AppLayout>
      <Sidebar>
        <CustomNavlink to="dashboard">
          <HiHome />
          <span>داشبورد</span>
        </CustomNavlink>

        <CustomNavlink to="users">
          <HiUser />
          <span>کاربران</span>
        </CustomNavlink>

        <CustomNavlink to="projects">
          <HiOutlineViewGrid />
          <span>پروژه ها</span>
        </CustomNavlink>

        <CustomNavlink to="proposals">
          <HiCollection />
          <span>درخواست ها</span>
        </CustomNavlink>
      </Sidebar>
    </AppLayout>
  );
}

export default AdminLayout;
