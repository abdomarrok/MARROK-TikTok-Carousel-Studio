import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PALETTES } from '../types';
import { SlideImageStudio } from './SlideImageStudio';

describe('SlideImageStudio', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects remote edit sources before making a request', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(
      <SlideImageStudio
        slide={{
          type: 'image',
          enTitle: 'Architecture',
          arTitle: 'معمارية',
          imageUrl: 'https://example.com/remote.png',
        }}
        theme={DEFAULT_PALETTES.teal}
        onApplyImage={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Apply AI Edit/i }));

    expect(screen.getByText(/embedded PNG, JPEG, WEBP, or GIF/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
