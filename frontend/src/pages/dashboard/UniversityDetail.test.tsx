import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import UniversityDetail from './UniversityDetail';
import { universityProfiles } from '../../data/universityProfiles';

const renderPage = (slug: string) =>
  render(
    <MemoryRouter initialEntries={[`/dashboard/programmes/${slug}`]}>
      <Routes>
        <Route path="/dashboard/programmes/:slug" element={<UniversityDetail />} />
        <Route path="/dashboard/programmes" element={<div>programmes list</div>} />
      </Routes>
    </MemoryRouter>,
  );

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

describe('UniversityDetail', () => {
  it.each(universityProfiles.map((profile) => [profile.name, profile.slug]))('renders the page for %s', (name, slug) => {
    renderPage(slug);

    expect(screen.getByRole('heading', { level: 1, name })).toBeTruthy();
    expect(screen.getByText('Intake timeline')).toBeTruthy();
    expect(screen.getAllByText('Applications open').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Start application').length).toBeGreaterThan(0);
  });

  it('switches the timeline when another intake is chosen', () => {
    renderPage(universityProfiles[0].slug);
    const intake = universityProfiles[0].intakes[2];

    fireEvent.click(screen.getByRole('button', { name: new RegExp(intake.label) }));

    expect(screen.getAllByText(new RegExp(intake.milestones[0].title)).length).toBeGreaterThan(0);
  });

  it('opens a FAQ answer when its question is clicked', () => {
    renderPage(universityProfiles[0].slug);
    const faq = universityProfiles[0].faqs[0];

    expect(screen.queryByText(faq.answer)).toBeNull();
    fireEvent.click(screen.getByText(faq.question));
    expect(screen.getByText(faq.answer)).toBeTruthy();
  });

  it('sends unknown universities back to the list', () => {
    renderPage('not-a-university');
    expect(screen.getByText('programmes list')).toBeTruthy();
  });
});
