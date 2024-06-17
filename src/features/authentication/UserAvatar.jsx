import useUser from "./useUser";

function UserAvatar() {
  const { user } = useUser();

  return (
    <div className="flex items-center gap-x-2 text-secondary-600">
      <img
        className="w-7 h-7 rounded-full object-cover object-center"
        src="/public/user.jpg"
        alt="user-account"
      />
      <span>{user.name}</span>
    </div>
  );
}

export default UserAvatar;
