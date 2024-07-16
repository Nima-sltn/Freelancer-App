import Stat from "./../../ui/Stat";
import { HiCollection, HiOutlineViewGrid, HiUser } from "react-icons/hi";

function Stats({ proposals, users, projects }) {
  return (
    <div className="grid grid-cols-3 gap-8">
      <Stat
        title="کاربران"
        value={users}
        color="green"
        icon={<HiUser className="w-20 h-20" />}
      />
      <Stat
        title="درخواست ها"
        value={proposals}
        color="primary"
        icon={<HiOutlineViewGrid className="w-20 h-20" />}
      />
      <Stat
        title="پروژه ها"
        value={projects}
        color="yellow"
        icon={<HiCollection className="w-20 h-20" />}
      />
    </div>
  );
}

export default Stats;
