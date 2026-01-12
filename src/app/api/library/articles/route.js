import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/app/lib/authoption";
import { getAllPDFs, getAllPDFsForCoach } from "../../../lib/db/resourceRepo.js";
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

        let articles;
        if (user.role === "admin") {
            articles = await getAllPDFs();
        } else if (user.role === "coach") {
            const parsedFolderId = folderId === 'null' || folderId === '' ? null : folderId;
            articles = await getAllPDFsForCoach(user.id, parsedFolderId);
        }

        return NextResponse.json({ status: true, articles });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
