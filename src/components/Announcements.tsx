const Announcements = () => {
  return (
    <div className="bg-white p-4 rounded-md">
      <div className="flex justify-between items-center">
        <h1 className="font-semibold text-xl">Announcements</h1>
        <span className="text-gray-400 text-xs">View All</span>
      </div>
      <div className="flex flex-col gap-4 mt-4">
        <div className="bg-academixSkyLight p-4 rounded-md">
          <div className="flex justify-between items-center">
            <h2 className="font-medium">Lorem ipsum dolor sit</h2>
            <span className="bg-white px-1 py-1 rounded-md text-gray-400 text-xs">
              2025-01-01
            </span>
          </div>
          <p className="mt-1 text-gray-400 text-sm">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptatum,
            expedita. Rerum, quidem facilis?
          </p>
        </div>
        <div className="bg-academixPurpleLight p-4 rounded-md">
          <div className="flex justify-between items-center">
            <h2 className="font-medium">Lorem ipsum dolor sit</h2>
            <span className="bg-white px-1 py-1 rounded-md text-gray-400 text-xs">
              2025-01-01
            </span>
          </div>
          <p className="mt-1 text-gray-400 text-sm">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptatum,
            expedita. Rerum, quidem facilis?
          </p>
        </div>
        <div className="bg-academixYellowLight p-4 rounded-md">
          <div className="flex justify-between items-center">
            <h2 className="font-medium">Lorem ipsum dolor sit</h2>
            <span className="bg-white px-1 py-1 rounded-md text-gray-400 text-xs">
              2025-01-01
            </span>
          </div>
          <p className="mt-1 text-gray-400 text-sm">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptatum,
            expedita. Rerum, quidem facilis?
          </p>
        </div>
      </div>
    </div>
  );
};

export default Announcements;
