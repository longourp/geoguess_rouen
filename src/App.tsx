import { Suspense, lazy } from 'react';
import { findPack, packs } from './data';
import { GameApp } from './components/GameApp';
import { useHashRoute } from './hooks/useHashRoute';

const EditorView = lazy(() =>
  import('./components/editor/EditorView').then((m) => ({ default: m.EditorView })),
);

/**
 * Hash-route switch: '#/' → first pack (Rouen), '#/<packId>' → that pack,
 * '#/editeur' → the puzzle editor. Unknown routes fall back to the first pack.
 */
export default function App() {
  const route = useHashRoute();

  if (route === 'editeur') {
    return (
      <Suspense fallback={<p style={{ textAlign: 'center', padding: '2rem' }}>Chargement…</p>}>
        <EditorView />
      </Suspense>
    );
  }

  const pack = (route && findPack(route)) || packs[0];
  return <GameApp key={pack.meta.id} pack={pack} />;
}
