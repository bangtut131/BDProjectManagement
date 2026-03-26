/**
 * Utility to generate and download an .ics file from task data
 */

const formatDateToICS = (dateStr, isEndOfDay = false) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    // ICS Format: YYYYMMDDTHHMMSSZ
    if (isEndOfDay) {
        date.setHours(23, 59, 59);
    } else {
        date.setHours(9, 0, 0); // Default to 9 AM if no time
    }
    
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

export const exportTasksToICS = (tasks, projectName = 'BD Project Management') => {
    if (!tasks || tasks.length === 0) return;

    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//BD Project Management//ID',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ];

    tasks.forEach(task => {
        const startDate = formatDateToICS(task.startDate || task.dueDate, false);
        const endDate = formatDateToICS(task.dueDate || task.startDate, true);
        
        if (!startDate || !endDate) return;

        icsContent.push(
            'BEGIN:VEVENT',
            `UID:${task.id}-${Date.now()}@bdproject.com`,
            `DTSTAMP:${formatDateToICS(new Date().toISOString())}`,
            `DTSTART:${startDate}`,
            `DTEND:${endDate}`,
            `SUMMARY:${task.title} [${task.priority ? task.priority.toUpperCase() : 'NORMAL'}]`,
            `DESCRIPTION:${task.description ? task.description.replace(/\n/g, '\\n') : ''}`,
            `STATUS:${task.status === 'done' ? 'CONFIRMED' : 'TENTATIVE'}`,
            'END:VEVENT'
        );
    });

    icsContent.push('END:VCALENDAR');

    const combinedStr = icsContent.join('\r\n');
    const blob = new Blob([combinedStr], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.replace(/\s+/g, '_')}_Tasks.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
