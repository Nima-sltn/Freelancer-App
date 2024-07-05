import Stat from "./../../ui/Stat";
import {
  HiCollection,
  HiCurrencyDollar,
  HiOutlineViewGrid,
} from "react-icons/hi";

function Stats({ proposals }) {
  const numOfProposals = proposals.length;
  const acceptedProposals = proposals.filter((p) => p.status === 2);
  const balance = acceptedProposals.reduce((acc, curr) => acc + curr.price, 0);

  return (
    <div className="grid grid-cols-2 gap-8">
      <Stat
        title="درخواست ها"
        value={numOfProposals}
        color="primary"
        icon={<HiOutlineViewGrid className="w-20 h-20" />}
      />
      <Stat
        title="درخواست های تایید شده"
        value={acceptedProposals.length}
        color="green"
        icon={<HiCurrencyDollar className="w-20 h-20" />}
      />
      <Stat
        title="کیف پول"
        value={balance}
        color="yellow"
        icon={<HiCollection className="w-20 h-20" />}
      />
    </div>
  );
}

export default Stats;
