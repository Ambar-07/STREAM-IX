import { NextRequest, NextResponse } from "next/server";
import { getInMemoryWatchlist, setInMemoryWatchlist } from "../route";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const movieId = Number(id);

  if (!isNaN(movieId)) {
    const list = getInMemoryWatchlist();
    setInMemoryWatchlist(list.filter((m) => Number(m.id) !== movieId));
  }

  return NextResponse.json({ movies: getInMemoryWatchlist() });
}
