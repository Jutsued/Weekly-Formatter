function convertToUnorderedList(inputText) {
    // Split input text by lines
    const lines = inputText.split('\n');

    let output = '';

    let sectionTitle = '';
    let inList = false;

    lines.forEach((line, index) => {
        // Check if the line contains a section title (e.g., Location(s):, Formation:, Route:, etc.)
        if (/^\s*[a-zA-Z\s]+\s*:/.test(line)) {
            // Close the previous list if it exists
            if (inList) {
                output += '</ul>\n';
                inList = false;
            }
            // Add the section title with <strong> tag
            sectionTitle = line.trim();
            if (sectionTitle !== '') {
                output += `<strong>${sectionTitle}</strong>\n`;
            }
        } else if (line.trim().startsWith('•')) {
            // If the line starts with a bullet point
            if (!inList) {
                // Start a new unordered list
                output += '<ul>\n';
                inList = true;
            }
            // Add it as a list item
            output += `<li>${line.trim().substring(1).trim()}</li>\n`;
        }
    });

    // Close the list if it's still open
    if (inList) {
        output += '</ul>\n';
    }

    return output;
}





const btnFormat = document.getElementById("bullet-format");
const btnReset = document.getElementById("bullet-reset");
const btnCopy = document.getElementById("bullet-copy");

function formatBulletPoints() {
    var inputText = document.getElementById("bulletPoint").value.trim();

    // Convert bullet points to unordered list
    var convertedText = convertToUnorderedList(inputText);

    // Set the formatted output
    document.getElementById("bulletPoint").value = convertedText;
}

function resetBulletPoints() {
    document.getElementById("bulletPoint").value = "";
}

function copyBulletPoints() {
    const resultTextarea = document.getElementById("bulletPoint");
    resultTextarea.select();
    document.execCommand("copy");

    const notification = document.querySelector(".notificationBullet");
    notification.textContent = "Text copied to clipboard!";
    notification.classList.add("show");

    setTimeout(function() {
        notification.classList.remove("show");
    }, 3000); // 3000 milliseconds = 3 seconds
}

btnFormat.addEventListener('click', formatBulletPoints);
btnReset.addEventListener('click', resetBulletPoints);
btnCopy.addEventListener('click', copyBulletPoints);

