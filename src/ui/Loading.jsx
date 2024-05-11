import { ThreeDots } from "react-loader-spinner";

function Loading({ width = "75", height = "40" }) {
  return (
    <ThreeDots
      width={width}
      height={height}
      radius={9}
      color="rgb(var(--color-primary-900))"
      wrapperStyle={{ display: "flex", justifyContent: "center" }}
      visible={true}
    />
  );
}

export default Loading;
