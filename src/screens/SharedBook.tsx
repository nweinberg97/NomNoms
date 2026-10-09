import React, { useEffect, useState } from 'react';
import { Reader } from '../book/Reader';
import { printableBook } from '../book/layoutEngine';
import { Icon, Wordmark } from '../components/Icon';
import { navigate, useRoute } from '../lib/router';
import type { Baby, Book, MediaItem, Memory } from '../lib/types';
import { firstName } from '../lib/util';
import { LocalRepository, resolveShare } from '../repositories/LocalRepository';
import { useApp } from '../state/store';

/**
 * What a family member sees when they open a shared link: the book, read-only,
 * with no app chrome. Respects the book's visibility setting.
 */
export function SharedBook({ token }: { token: string }) {
  const { account } = useApp();
  const { query } = useRoute();
  const [data, setData] = useState<{ book: Book; memories: Memory[]; media: Map<string, MediaItem>; baby?: Baby; owner: string } | null | undefined>();

  useEffect(() => {
    (async () => {
      const ref = resolveShare(token);
      if (!ref) return setData(null);
      const repo = new LocalRepository(ref.accountId);
      const book = await repo.books.getBook(ref.babyId);
      if (!book || book.share.token !== token) return setData(null);
      const [memories, media, babies] = await Promise.all([repo.memories.listMemories(ref.babyId), repo.media.listMedia(ref.babyId), repo.babies.getBabies()]);
      setData({ book, memories, media: new Map(media.map((m) => [m.id, m])), baby: babies.find((b) => b.id === ref.babyId), owner: ref.accountId });
    })();
  }, [token]);

  if (data === undefined) return <div className="shared-msg" />;
  if (data === null) {
    return (
      <div className="shared-msg">
        <Wordmark size={20} />
        <h1 className="display">This book isn’t available</h1>
        <p className="muted">The link may have been turned off, or the book lives on another device.</p>
      </div>
    );
  }
  const isOwner = account?.id === data.owner;
  const vis = data.book.share.visibility;
  if (vis === 'private' && !isOwner) {
    return (
      <div className="shared-msg">
        <Wordmark size={20} />
        <Icon name="lock" size={26} />
        <h1 className="display">This book is private</h1>
        <p className="muted">Ask the family to share it with you.</p>
      </div>
    );
  }

  const chapterId = query.get('chapter');
  let book = printableBook(data.book, data.media, new Map(data.memories.map((m) => [m.id, m])));
  if (chapterId) {
    const pages = book.pages.filter((p) => p.chapterId === chapterId);
    if (pages.length) book = { ...book, pages };
  }

  return (
    <Reader
      book={book}
      memories={data.memories}
      media={data.media}
      onClose={() => navigate(isOwner ? '/book' : '/')}
      banner={
        <div className="shared-banner">
          {isOwner ? (
            <>
              <Icon name="eye" size={14} /> Previewing as family · {vis === 'private' ? 'currently private — only you can open it' : vis === 'family' ? `shared with ${data.book.share.familyEmails.length || 'no'} family member${data.book.share.familyEmails.length === 1 ? '' : 's'}` : 'anyone with the link can view'}
            </>
          ) : (
            <><Icon name="book" size={14} /> {data.baby ? `${firstName(data.baby.name)}’s book` : 'A NomNoms book'}, shared with you</>
          )}
        </div>
      }
    />
  );
}
