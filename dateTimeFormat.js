function convertDate(dateString) {
  const parts = dateString.split("/");
  const month = parseInt(parts[0], 10) - 1; // Month is 0-indexed
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  // Handle two-digit year: Assuming 20xx for years up to 99
  const fullYear = year < 100 ? 2000 + year : year;

  const dateObject = new Date(fullYear, month, day);

  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(dateObject);
}

const inputDate = "11/15/25";
const outputDate = convertDate(inputDate);
console.log(outputDate); // Output: "September 1, 2025"
