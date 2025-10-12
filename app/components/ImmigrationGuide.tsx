'use client';

import { useI18n } from '@/lib/contexts/I18nContext';

/**
 * ImmigrationGuide component displays comprehensive immigration rights and protection information
 *
 * @component
 * @returns {JSX.Element} A detailed guide covering rights, protections, and community action
 */
export default function ImmigrationGuide() {
  const { t } = useI18n();
  const guide = t.locationPermission?.immigrationGuide || t.main?.immigrationGuide;

  if (!guide) return null;

  /**
   * Renders markdown-style bold text (**text**) as HTML strong tags
   * @param {string} text - Text potentially containing **bold** markers
   * @returns {JSX.Element | string} Rendered text with bold formatting
   */
  const renderBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index}>{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
      </>
    );
  };

  /**
   * Renders text with link placeholders ({linkName}) as clickable links
   * @param {string} text - Text containing {placeholder} markers
   * @param {string} linkText - Display text for the link
   * @param {string} linkUrl - URL for the link
   * @returns {JSX.Element} Rendered text with active links
   */
  const renderTextWithLink = (text: string, linkText: string, linkUrl: string) => {
    // Check if text contains a placeholder
    if (!text.includes('{')) {
      return <>{text}</>;
    }

    const parts = text.split(/\{.*?\}/);
    return (
      <>
        {parts[0]}
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          {linkText}
        </a>
        {parts[1]}
      </>
    );
  };

  return (
    <div className="mt-6 p-6 bg-white border border-gray-300 rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{guide.heading}</h2>

      {/* If Stopped by ICE */}
      <section className="mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-3">{guide.stoppedByICE.heading}</h3>

        <div className="mb-4">
          <h4 className="text-lg font-medium text-gray-700 mb-2">{guide.stoppedByICE.knowYourRightsHeading}</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
            {guide.stoppedByICE.rights.map((right: string, index: number) => (
              <li key={index}>{right}</li>
            ))}
          </ul>
        </div>

        <div className="mb-4">
          <h4 className="text-lg font-medium text-gray-700 mb-2">{guide.stoppedByICE.warrantsHeading}</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
            {guide.stoppedByICE.warrants.map((warrant: string, index: number) => (
              <li key={index}>{renderBoldText(warrant)}</li>
            ))}
          </ul>
        </div>

        <div className="mb-4">
          <h4 className="text-lg font-medium text-gray-700 mb-2">{guide.stoppedByICE.ifArrestedHeading}</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
            {guide.stoppedByICE.arrested.map((item: string, index: number) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* School Safety */}
      <section className="mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-3">{guide.schoolSafety.heading}</h3>
        <p className="text-gray-700 mb-2">{guide.schoolSafety.description}</p>
        <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
          {guide.schoolSafety.actions.map((action: string, index: number) => (
            <li key={index}>{action}</li>
          ))}
        </ul>
      </section>

      {/* Local Police & 287(g) */}
      <section className="mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-3">{guide.localPolice.heading}</h3>
        <p className="text-gray-700 mb-2">{renderBoldText(guide.localPolice.warning)}</p>
        <p className="text-gray-700">{renderBoldText(guide.localPolice.whatIs287g)}</p>
      </section>

      {/* How Citizens Can Help */}
      <section className="mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">{guide.howCitizensCanHelp.heading}</h3>

        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-2">{guide.howCitizensCanHelp.getInvolvedHeading}</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
              {guide.howCitizensCanHelp.getInvolved.map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-2">{guide.howCitizensCanHelp.contactCongressHeading}</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
              {guide.howCitizensCanHelp.contactCongress.map((item: string, index: number) => (
                <li key={index}>
                  {renderTextWithLink(
                    item,
                    guide.howCitizensCanHelp.representativesText,
                    guide.howCitizensCanHelp.representativesUrl
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-2">{guide.howCitizensCanHelp.supportOrgsHeading}</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
              {guide.howCitizensCanHelp.supportOrgs.map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-2">{guide.howCitizensCanHelp.stayInformedHeading}</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
              {guide.howCitizensCanHelp.stayInformed.map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-2">{guide.howCitizensCanHelp.organizeHeading}</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
              {guide.howCitizensCanHelp.organize.map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-2">{guide.howCitizensCanHelp.sanctuaryHeading}</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
              {guide.howCitizensCanHelp.sanctuary.map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-2">{guide.howCitizensCanHelp.repeal287gHeading}</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
              {guide.howCitizensCanHelp.repeal287g.map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Need Legal Help */}
      <section className="mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-3">{guide.legalHelp.heading}</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
          {guide.legalHelp.tips.map((tip: string, index: number) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      </section>

      {/* Key Takeaway */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-gray-700">{renderBoldText(guide.keyTakeaway)}</p>
      </div>
    </div>
  );
}
