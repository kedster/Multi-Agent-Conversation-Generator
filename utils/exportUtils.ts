import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const getThemeStyles = (themeId: string): string => {
    const commonStyles = `
        h2 { font-size: 2rem; margin-top: 0; margin-bottom: 1.5rem; }
        h3 { font-size: 1.5rem; margin-top: 2rem; margin-bottom: 1rem; border-bottom: 1px solid; padding-bottom: 0.5rem; }
        p, ul { margin-bottom: 1rem; line-height: 1.6; }
        ul { padding-left: 1.5rem; }
        li { margin-bottom: 0.5rem; }
        strong { font-weight: 600; }
    `;

    switch (themeId) {
        case 'dev': return `
            body { font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif; background-color: #0d1117; color: #c9d1d9; }
            .container { max-width: 800px; margin: 2rem auto; background-color: #161b22; padding: 3rem; border-radius: 8px; border: 1px solid #30363d; }
            h2, h3 { color: #58a6ff; }
            h3 { border-color: #30363d; }
            strong { color: #a5d6ff; }
            li::marker { color: #58a6ff; }
        `;
        case 'mkt': return `
            body { font-family: 'Inter', sans-serif; background-color: #f8fafc; color: #1e293b; }
            .container { max-width: 800px; margin: 2rem auto; background-color: #ffffff; padding: 0; border-radius: 8px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); overflow: hidden; }
            .header { padding: 3rem; color: white; background: linear-gradient(90deg, #F97316, #EC4899); }
            .content { padding: 1rem 3rem 3rem 3rem; }
            h2 { font-size: 2.5rem; }
            h3 { color: #f97316; border-color: #e2e8f0; }
            strong { color: #be123c; }
        `;
        case 'bio': return `
            body { font-family: 'Georgia', serif; background-color: #fdf6e3; color: #586e75; }
            .container { max-width: 750px; margin: 2rem auto; background-color: #fdf6e3; padding: 3rem; }
            h2, h3 { font-family: 'Helvetica Neue', sans-serif; font-weight: 300; color: #cb4b16; }
            h3 { border-color: #eee8d5; }
            strong { color: #073642; }
        `;
        case 'party': return `
            body { font-family: 'Poppins', sans-serif; background-color: #f0fdfa; color: #0f172a; }
            .container { max-width: 800px; margin: 2rem auto; background-color: #ffffff; padding: 3rem; border-radius: 16px; border: 2px solid #a78bfa; box-shadow: 8px 8px 0px #a78bfa; }
            h2 { color: #a855f7; }
            h3 { color: #d946ef; border-color: #e5e7eb; border-style: dashed; }
            li { list-style-type: '🎉 '; }
            strong { color: #7c3aed; }
        `;
        case 'adv': return `
            @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&display=swap');
            body { font-family: 'IM Fell English', serif; background-image: url('https://www.transparenttextures.com/patterns/old-wall.png'); background-color: #f3e9d2; color: #4a2c2a; }
            .container { max-width: 800px; margin: 2rem auto; background-color: rgba(243, 233, 210, 0.8); padding: 3rem; border: 10px solid #c8ada3; border-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='75' height='75'%3E%3Cpath d='M0 0 H75 V75 H0 Z' fill='none' stroke='%23C8ADA3' stroke-width='4'/%3E%3C/svg%3E") 10; }
            h2, h3 { font-family: 'IM Fell English', serif; font-weight: bold; color: #8c3838; text-align: center; }
            h3 { border: none; border-top: 2px solid #b48a78; border-bottom: 2px solid #b48a78; padding: 0.5rem 0; margin-top: 2rem; }
            strong { color: #5c1f1f; }
        `;
        default: return `
            body { font-family: sans-serif; line-height: 1.6; padding: 1rem; }
            .container { max-width: 800px; margin: auto; padding: 2rem; border: 1px solid #ccc; border-radius: 8px; }
        `;
    }
}

export const getStyledReport = (htmlContent: string, serviceId: string, title: string): string => {
  const styles = getThemeStyles(serviceId);
  const header = serviceId === 'mkt' ? 
    `<div class="header"><h2>${title}</h2></div><div class="content">${htmlContent}</div>` : 
    `<h2>${title}</h2>${htmlContent}`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=IM+Fell+English&family=Inter&family=Poppins&display=swap" rel="stylesheet">
      <style>
        ${getThemeStyles('common')}
        ${styles}
      </style>
    </head>
    <body>
      <div class="container">
        ${header}
      </div>
    </body>
    </html>
  `;
};

export const downloadHtml = (fullHtml: string, fileName: string) => {
  const blob = new Blob([fullHtml], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${fileName}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
};

export const downloadPdf = async (element: HTMLElement, fileName: string) => {
  try {
    // Wait a bit to ensure the iframe content is fully loaded
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null, // Let the body background from the theme show through
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        width: element.scrollWidth,
        height: element.scrollHeight,
    });
    
    const imgData = canvas.toDataURL('image/png');
    
    // Calculate appropriate PDF dimensions
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    // Use A4 proportions but scale to fit content
    const pdfWidth = Math.min(imgWidth, 2480); // Max width for reasonable file size
    const pdfHeight = (imgHeight * pdfWidth) / imgWidth;
    
    const pdf = new jsPDF({
      orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
      unit: 'px',
      format: [pdfWidth, pdfHeight]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${fileName}.pdf`);
    
    return true; // Success indicator
  } catch (error) {
    console.error("Error generating PDF:", error);
    
    // More specific error messages
    let errorMessage = "Could not generate PDF. ";
    if (error instanceof Error) {
      if (error.message.includes('canvas')) {
        errorMessage += "There was an issue capturing the content. Please try again.";
      } else if (error.message.includes('CORS')) {
        errorMessage += "Security restrictions prevented PDF generation. Please try downloading as HTML instead.";
      } else {
        errorMessage += `Error: ${error.message}`;
      }
    } else {
      errorMessage += "Please try again or download as HTML instead.";
    }
    
    alert(errorMessage);
    return false; // Failure indicator
  }
};
