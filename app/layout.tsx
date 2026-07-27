import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "세특 스튜디오 | 학생의 성장을 기록하는 공간",
  description: "학생 활동을 과목별 세특 초안으로 정리하고 저장합니다.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
