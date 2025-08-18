function formatClosureInfo() {
  const inputText = document.getElementById("closureInfo").value;
  const formattedOutput = document.getElementById("formattedOutput");

  let output = ""; // To store formatted output

  const lines = inputText.split("\n");
  lines.forEach((line) => {
    const splitIndex = line.indexOf(":");

    if (splitIndex !== -1) {
      const strongPart = line.substring(0, splitIndex).trim();
      let paragraphPart = line.substring(splitIndex + 1).trim();

      // Find any date in MM/DD/YY or MM/DD/YYYY
      paragraphPart = paragraphPart.replace(
        /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
        (match) => convertDate(match) // replace each found date
      );

      const location = `<strong>${formatText(strongPart)}</strong>`;
      const details = `<p>${formatText(paragraphPart)}</p>`;

      // Add the formatted location and details to the output as raw HTML tags
      // output += location + "\n" + details + "\n\n";
      output += location + "\n" + details + "\n\n";
    } else {
      // output +=
      //   "Invalid input format. Please provide information in the format 'Location: Details.'\n\n";
      console.log(`Invalid entry (missing ":"): ${line}`);
    }
  });

  // Set the formatted output in the textarea as raw HTML tags
  formattedOutput.value = output.trim();
}

function formatText(text) {
  // Remove ":00" from exact hour times
  text = text.replace(/\b(\d+):00\s*(am|pm)\b/gi, "$1$2");
  text = text.replace(/\b(\d+):00\b/g, "$1");
  return text;
}

function resetInput() {
  document.getElementById("closureInfo").value = "";
  document.getElementById("formattedOutput").value = ""; // Clear formatted output
}

function copyResult() {
  var resultTextarea = document.getElementById("formattedOutput");
  resultTextarea.select();
  document.execCommand("copy");

  var notification = document.getElementById("notificationOutput");
  notification.textContent = "Text copied to clipboard!";
  notification.classList.add("show");

  setTimeout(function () {
    notification.classList.remove("show");
  }, 3000); // 3000 milliseconds = 3 seconds
}

document
  .getElementById("btn-format")
  .addEventListener("click", formatClosureInfo);
document.getElementById("btn-reset").addEventListener("click", resetInput);
document.getElementById("btn-copy").addEventListener("click", copyResult);
