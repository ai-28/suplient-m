import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/app/lib/authoption";
import { getAllVideos, getAllVideosForCoach } from "../../../lib/db/resourceRepo.js";
import { userRepo } from "@/app/lib/db/userRepo";

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const email = session.user.email;
        const user = await userRepo.getUserByEmail(email);
        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const folderId = searchParams.get('folderId'); // null = root, UUID = specific folder, undefined = all

        let videos;
        if (user.role === "admin") {
            videos = await getAllVideos();
        } else if (user.role === "coach") {
            const parsedFolderId = folderId === 'null' || folderId === '' ? null : folderId;
            videos = await getAllVideosForCoach(user.id, parsedFolderId);
        }

        return NextResponse.json({ status: true, videos });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
