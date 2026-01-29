import LoginSkeleton from "./authentication/LoginSkeleton";
import { Skeleton } from "./ui/skeleton";

export const GetSkeleton = () => {
    if (process.env.NEXT_PUBLIC_AUTH_FLOW === 'true') {
        return <LoginSkeleton />;
      }
      else{
        return(
          <div className="flex justify-center items-center w-full h-screen">
            <div className="px-10 py-4 space-y-4 sm:w-full md:w-[50vw]">
              <div className="flex justify-end">
                <Skeleton className=" w-2/3 ml-auto" style={{ height: "5rem" }} />
                <Skeleton className="w-8 h-8 rounded-full ml-2" />
              </div>
  
              <div className="flex items-start space-x-2">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="w-3/4" style={{ height: "10rem" }} />
              </div>
  
              <div className="flex justify-end">
                <Skeleton className=" w-2/3 ml-auto" style={{ height: "5rem" }} />
                <Skeleton className="w-8 h-8 rounded-full ml-2" />
              </div>
  
              <div className="flex items-start space-x-2">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="w-3/4" style={{ height: "10rem" }} />
              </div>
            </div>
          </div>
        )
        
      }
}