// Threads.tsx
const Threads = () => {
    return (
        <div
            className="border-2 border-black overflow-auto p-2"
            style={{
                width: "20%",
                height: "100vh",
                position: "sticky",
                top: 0, 
                backgroundColor:"#fcfafa"
            }}
        >
            this is threads window
            <div>
                {Array.from({ length: 50 }, (_, i) => (
                    <p key={i}>Thread {i + 1}</p>
                ))}
            </div>
        </div>
    );
};

export default Threads;
