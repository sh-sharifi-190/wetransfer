import { GetServerSideProps } from "next";

export default function Home() {
  return null; // Render nothing, just redirect
}

// This runs on the server before the page loads
export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    redirect: {
      destination: "/auth/signIn", // Send them to Sign In immediately
      permanent: false,
    },
  };
};