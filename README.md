<h1 style="line-height: 0">Plan2JSON</h1>
A javascript library that converts Natural Language Schedules to a JSON Format
<hr style="line-height: 0;">

**`Plan2JSON`** is a library that accepts various natural language date expressions and generates JSON output with **structured** date information. It provides support for multiple languages and allows you to specify the date format for localization.

## Features

- Parse expressions like "tomorrow," "in 2 days," "every Monday and Tuesday," "in 1 month," and "at the end of the month."
- Support for multiple languages.
- Flexible and customizable date output options in JSON format.
- No external dependencies.

## Output Examples

For these examples, we've set the current date to `27/07/2023`. Below are a few examples of user inputs and their corresponding JSON outputs:

- **Input**: "To do it for tomorrow"<br>**Output**: `{"schType":"once","sch":{"date":"28/07/2023","mode":"d","appear":1}}`<br>**Explanation**: Since the current date is set to `27/07/2023`, "tomorrow" corresponds to 28/07/2023.
  <br />&nbsp;<br />
- **Input**: "Remind me in 15 days"<br>**Output**: `{"schType":"once","sch":{"date":"11/08/2023","mode":"d","appear":1}}`<br>**Explanation**: 15 days from the current date.
  <br />&nbsp;<br />
- **Input**: "For the 09/02/2024"<br>**Output**: `{"schType":"once","sch":{"date":"09/02/2024","mode":"d","appear":1}}`<br>**Explanation**: The date provided "09/02/2024" directly corresponds to itself.
  <br />&nbsp;<br />
- **Input**: "Schedule it every Wednesdays, Mondays, and Fridays"<br>**Output**: `{"schType":"reset","sch":{"dow":[2,4,6],"schType":"reset","mode":"w","appear":1}}`<br>**Explanation**: The days of the week provided ("Wednesdays, Mondays, and Fridays") correspond to an array [2,4,6] in the week (assuming Monday is 1, Tuesday is 2, etc.) and the schedule type is set to "reset", indicating a recurring schedule.

## Usage

Using Plan2JSON involves simply incorporating the library files into your project. As a JavaScript class, Plan2JSON needs to be loaded into your project context.
Here's an example showcasing how to use the library:

```js
const langID = "en",
      naturalLanguageInputExample = "Every Mondays and Tuesdays";

async function toInterprete(naturalLanguageInputExample) {
  // Import the main SchInterpreter class
  const module = await import("<project_dir>/SchInterpreter.js");

  // Import the desired language module
  const lang = await import(`<project_dir>/js/i18n/${langID}.js`);

  // Instantiate the SchInterpreter with your desired date format
  window.Plan2JSON = new module.SchInterpreter();

  // Set the language of the SchInterpreter instance
  window.Plan2JSON.setLang(lang.vocabulary);

  // Use the toInterprete method to convert natural language to JSON
  console.log(window.Plan2JSON.toInterprete(naturalLanguageInputExample));
}

toInterprete(naturalLanguageInputExample);
```

##Configuration
You can customize Plan2JSON to cater to your application's specific requirements by specifying certain parameters when instantiating the SchInterpreter class.<br/>If not specified, the module will use the **default date format of the user's browser** :

- **`dateFormat`**: This defines the format in which the user will write the dates.

- **`dateFormatOutput`**: This parameter specifies the format in which the date will be written in the resulting JSON.

Here's an example of how to initialize Plan2JSON with these options:

```js
const module = await import("<project_dir>/SchInterpreter.js");
window.Plan2JSON = new module.SchInterpreter({ dateFormat: 'DD/MM/YYYY', dateFormatOutput: 'YYYY-MM-DD' });
```

## Supported Languages

Plan2JSON supports multiple languages, and you can load the language module dynamically. Here's an example of how to load a language module:

```js
const lang = "en";

await import("<project_dir>/i18n/" + lang + ".js").then((module) => {
  window.Plan2JSON.setLang(module.vocabulary);
});
```

The language dictionnary in managed in its own fileHere is an example for the English dictionary (en.js) :

```js
const vocabulary = {
  expressions: {
    repeat: ["every"],
    endMonth: ["end month"],
    afterTomorrow: ["after tomorrow", "aftertomorrow"],
    today: ["today"],
    tomorrow: ["tomorrow"],
    day: ["day", "days"],
    week: ["week", "weeks"],
    month: ["month", "months"],
    year: ["year", "years"],
  },
  enums: {
    weekDays: [
      ["sunday", "sundays"],
      ["monday", "mondays"],
      ["tuesday", "tuesdays"],
      ["wednesday", "wednesdays"],
      ["thursday", "thursdays"],
      ["friday", "fridays"],
      ["saturday", "saturdays"],
    ],
    monthNames: [
      ["January"],
      ["February"],
      ["March"],
      ["April"],
      ["May"],
      ["June"],
      ["July"],
      ["August"],
      ["September"],
      ["October"],
      ["November"],
      ["December"],
    ],
  },
};

export { vocabulary };
```

Currently supported languages :

- English (**`en.js`**)
- Français (**`fr.js`**)
- Deutsch (**`de.js`**)
- Español (**`es.js`**)
- Italiano (**`it.js`**)

## License

**`Plan2JSON`** is released under the **MIT License**.

## Copyright and Author

© iKod 2023

Author: Shymon Foyzul
