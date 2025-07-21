export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studioId = searchParams.get('studioId');

    if (!studioId) {
      return NextResponse.json({ error: 'Missing studioId' }, { status: 400 });
    }

    const questsRef = collection(db, 'quests');
    const q = query(questsRef, where('studioId', '==', studioId));
    const snapshot = await getDocs(q);

    const quests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ success: true, quests });
  } catch (error) {
    console.error('Error fetching quests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }

    const questData = await request.json();

    // Validate required fields
    if (!questData.name || !questData.studioId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const quest = {
      ...questData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    const questsRef = collection(db, 'quests');
    await addDoc(questsRef, quest);

    return NextResponse.json({ 
      success: true, 
      quest,
      message: 'Quest created successfully' 
    });

  } catch (error) {
    console.error('Error creating quest:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}