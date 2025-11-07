const Header = () => {
    return (
      <div
        className="border-gray-300 m-auto mb-2"
        style={{
          width: "95%",
          height: "3rem",
          border: "1px solid lightgrey",
          position: "sticky",
          top: 0,
          zIndex: 1000, // Ensures it stays above other content
          background: "white", // Prevents overlap transparency
        }}
      >
        Header
      </div>
    );
  };
  
  export default Header;
  