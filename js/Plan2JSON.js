/*! MIT License

 * Copyright (c) 2023 iKod

 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/*jshint esversion: 11*/
/*global $*/
/*exported Plan2JSON*/

class Plan2JSON {
  // ========================================================================== //
  //* INITIALIZATION AND MAIN FUNCTION
  // ========================================================================== //

  /**
   * * Variables initialisation (constructor)
   * @param dateFormat (optionnal) : string, format of the date inputted, examples: "DD/MM/YYYY", "YYYY/MM/DD", etc...
   * @param dateFormatOutput (optionnal) : string, format of the date to output, examples: "DD/MM/YYYY", "YYYY/MM/DD", etc...
   */
  constructor(options) {
    const date = new Date(Date.UTC(2000, 0, 31, 0, 0, 0, 0)),
      intlCode =
        navigator.language ||
        navigator.userLanguage ||
        (navigator.languages && navigator.languages.length && navigator.languages[0]) ||
        navigator.language ||
        navigator.browserLanguage ||
        navigator.systemLanguage ||
        "en",
      t = new Intl.DateTimeFormat(intlCode).format(date), //  31/1/2000
      defaultDateFormat = t.replace("2000", "YYYY").replace("00", "YY").replace("01", "MM").replace("31", "DD");

    this.dateFormat = options?.dateFormat || defaultDateFormat;
    this.dateFormatOutput = options?.dateFormatOutput || this.dateFormat;
    this.today = new Date();
    this.modeleA = {
      formattedDate: ["date"], // 01/01/2000
      day: ["day"], // n days
      week: ["week"], // n weeks
      month: ["month"], // n months
      year: ["year"], // n years
      weekDays: ["weekDays"], // monday
      monthNames: ["monthNames"], // january
      endMonth: ["endMonth"], // end of the month
      tomorrow: ["tomorrow"],
      afterTomorrow: ["afterTomorrow"],
      today: ["today"],
    };
    this.modeleB = {
      everyDay: ["repeat", "day"], // every day
      everyWeek: ["repeat", "week"], // every weeks
      everyMonth: ["repeat", "month"], // every month
      everyWeekDays: ["repeat", "weekDays"], // example : every mondays
    };

    this.tableOfFlags = {};
    this.schedule = { schType: "", sch: {} };
  }

  //* setLang
  /**
   * * Initilization function, sets the language
   * @param vocabulary : JSON of the vocabulary in the correct language
   */
  setLang(vocabulary) {
    this.enums = {};
    this.expressions = {};

    for (const property in vocabulary.enums) {
      this.enums[property] = [];
      vocabulary.enums[property].forEach((enumsValue) => this.enums[property].push(this.normalizer(enumsValue.join("_")).split("_")));
    }

    for (const property in vocabulary.expressions) {
      this.expressions[property] = this.normalizer(vocabulary.expressions[property].join("_")).split("_");
    }
  }

  //* toInterprete
  /**
   * * Main function to use for this class
   * @param phrase : string, sentence to interprete into a date
   * @param env (optional) : string, "dev" // ! Do not declare it for production
   * @return : JSON that describes the schedule
   */
  toInterprete(phrase, env) {
    if (!this.enums || !this.expressions) return env == "prod" ? "Error : no vocabulary" : ["no vocabulary", "ERROR", "ERROR"];

    if (env) env = "dev";
    else env = "prod";

    if (0 > phrase.length > 500) return env == "prod" ? "Error : too short/long" : ["too short/long", "ERROR", "ERROR"];

    this.tableOfFlags = {};
    this.schedule = { schType: "", sch: {} };

    let formattedPhrase = this.toFormat(phrase),
      formattedDate = this.containsFormattedDate(phrase),
      modele = { type: "U", value: "undefined" },
      exit = "error";
    this.containsExpressions(formattedPhrase);
    this.containsEnums(formattedPhrase);

    // fonction qui detecte une date formattée et la récupère
    if (formattedDate) {
      // une date précise écrase tout le reste
      this.tableOfFlags = {};
      modele = { type: "A", value: "formattedDate" };
      this.schedule.sch = { date: formattedDate, mode: "d", appear: 1 };
      this.schedule.schType = "once";
    } else if (Object.keys(this.tableOfFlags).length != 0) {
      this.tableOfFlagsCleaner(phrase);
      modele = this.whatModel();
      this.tableOfFlagsInterpreter(modele);
    }

    if (modele.type == "U") {
      modele = { type: "C", value: "ERROR" };
      this.schedule = "ERROR";
    }

    // return différent si on est en prod ou en dev
    let result = env == "prod" ? this.schedule : [this.schedule, modele, exit];

    return result;
  }

  // ========================================================================== //
  //* UTILITY FUNCTIONS
  // ========================================================================== //

  // ========================================================================== //
  //* normalizer
  /**
   * * Normalizes a sentence, removes trailing spaces, accents, etc...
   * @param sentenceToNormalize : string
   * @return : string
   */
  normalizer(sentenceToNormalize) {
    sentenceToNormalize = sentenceToNormalize.toLowerCase();
    sentenceToNormalize = sentenceToNormalize.replace(/[,;:.]/g, " "); // punctuation
    sentenceToNormalize = sentenceToNormalize.replace(/\s+/g, " "); // removes any type of space
    sentenceToNormalize = sentenceToNormalize.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // normalize
    sentenceToNormalize = sentenceToNormalize.replace(/['’`]/g, " "); // deletes special caracteres
    sentenceToNormalize = sentenceToNormalize.replace(/-/g, " "); // deletes "-"

    return sentenceToNormalize;
  }

  // ========================================================================== //
  //* toFormat
  /**
   * * Function that adapt the sentence to be manipulated
   * @param phrase : string
   * @example : "at the end of month probably" => ["at","the","endmonth","of","probably"]
   * @return : array of string
   */

  toFormat(phrase) {
    let text = phrase,
      found = false;

    text = this.normalizer(text);

    let wordArray = text.split(" "),
      wordArrayCopy = [...wordArray],
      count = 0;

    let expressions = Object.keys(this.expressions),
      compoundWord,
      compoundPartArray;

    expressions.forEach((key) => {
      this.expressions[key].forEach((expression) => {
        compoundWord = expression;
        compoundPartArray = compoundWord.split(" ");
        count = 0;

        for (const compoundPart of compoundPartArray) {
          found = false;
          wordArray.forEach((word, n) => {
            if (word == compoundPart) {
              if (count == 0) {
                wordArray[n] = key;
                count++;
                found = true;
              } else {
                wordArray[n] = "";
                if (!found) count++;
              }
            }
          });
        }

        wordArray = wordArray.filter((n) => n);

        if (count >= compoundPartArray.length) {
          wordArrayCopy = [...wordArray];
        } else {
          wordArray = [...wordArrayCopy];
        }
      });
    });

    return wordArray;
  }

  // ========================================================================== //
  //* containsFormattedDate
  /**
   * * detects a date and returns it
   * @param phrase : string
   * @return : string
   */

  containsFormattedDate(phrase) {
    let regDate = new RegExp(/\d+[-/.][\d./-]+\d?/gm),
      found = phrase.match(regDate),
      containsADate = found ? found[0] : "",
      detectedDate = "";

    if (containsADate) {
      let format = this.dateFormat.split(/[-/.]/),
        arrDate = containsADate.split(/[-/.]/),
        day = arrDate[format.indexOf("DD")],
        month = arrDate[format.indexOf("MM")],
        posYear = format.indexOf("YYYY"),
        year = !arrDate[posYear] ? this.today.getFullYear() : arrDate[posYear];

      // if year in YY, converts in YYYY
      if (year < 100) {
        year = parseInt(year) + 2000;
      }

      detectedDate = new Date(year, month - 1, day);

      // If date is past, set for the next date
      if (this.today > detectedDate) detectedDate = this.lapse(detectedDate, 1, "year");

      detectedDate = this.toFormattedDate(detectedDate);
    }

    return detectedDate;
  }

  // ========================================================================== //
  //* containsExpressions
  /**
   * * Detects any flag "expressions"
   * @param formattedPhrase : string
   */

  containsExpressions(formattedPhrase) {
    formattedPhrase.forEach((word) => {
      for (let property of Object.keys(this.expressions)) {
        if (word == property) {
          this.tableOfFlags[property] = true;
        }
      }
    });

    return Object.keys(this.tableOfFlags).length != 0 ? this.tableOfFlags : {};
  }

  // ========================================================================== //
  //* containsEnums
  /**
   * * Detects any flag "enums"
   * @param formattedPhrase : array, array of the string inputted
   */
  containsEnums(formattedPhrase) {
    let tableOfIndex = [],
      integerInsideOfString,
      regContainNumber = new RegExp(/\d+/g),
      formattedPhraseJoined = formattedPhrase.join(" ");

    for (let property of Object.keys(this.enums)) {
      formattedPhrase.forEach((word) => {
        let n = this.enums[property].findIndex((temporality) => temporality.indexOf(word) != -1);
        if (n != -1) {
          tableOfIndex.push(n);
          if (tableOfIndex.length) this.tableOfFlags[property] = tableOfIndex;
        }
      });
    }

    if (this.tableOfFlags.hasOwnProperty("monthNames")) {
      integerInsideOfString = formattedPhraseJoined.match(regContainNumber) || [1];
      this.tableOfFlags.monthNames = { monthsIndexes: this.tableOfFlags.monthNames, monthNum: integerInsideOfString };
    }
  }

  // ========================================================================== //
  //* lapse
  /**
   * * Adds a time lapse from an origin date
   * @param dateOrigin : date, what date to increment
   * @param lapse : integer, how many days or month or year to add
   * @param type : string, "day" or "month" or "year"
   * @return : date
   */
  lapse(dateOrigin, lapse, type) {
    let d = new Date(dateOrigin);

    switch (type) {
      case "day":
        d.setDate(d.getDate() + lapse);
        break;
      case "month":
        d.setMonth(d.getMonth() + lapse);
        break;
      case "year":
        d.setFullYear(d.getFullYear() + lapse);
        break;
    }

    return new Date(d);
  }

  // ========================================================================== //
  //* toFormattedDate
  /**
   * * transfrom a js date to a JJ/MM/AAAA format
   * @param dateOrigin : date, JS to transform
   * @return : string, date in the format set in the constructor
   */

  toFormattedDate(normalDate) {
    let day = normalDate.getDate(),
      month = normalDate.getMonth() + 1,
      year = normalDate.getFullYear(),
      whatFormat = this.dateFormatOutput.split("/"),
      displayedDate = [];

    if (month < 10) month = "0" + month;
    if (day < 10) day = "0" + day;

    displayedDate[whatFormat.indexOf("DD")] = day;
    displayedDate[whatFormat.indexOf("MM")] = month;
    displayedDate[whatFormat.indexOf("YYYY")] = year;

    return displayedDate.join("/");
  }

  // ========================================================================== //
  //* tableOfFlagsCleaner
  /**
   * * Cleans this.tabelOfFlags and keeps only relevant information
   * @param phrase : string, original phrase
   */

  tableOfFlagsCleaner(phrase) {
    let tableOfKeys = Object.keys(this.tableOfFlags),
      regContainNumber = new RegExp(/\d+/g);

    // On remplace day ou month ou year par le nombre de jours ou mois ou année
    let temporalityIndex = 0;
    ["day", "month", "year", "week"].forEach((temporality) => {
      if (tableOfKeys.includes(temporality)) {
        temporalityIndex = phrase.match(regContainNumber) || [1];

        this.tableOfFlags[temporality] = temporalityIndex;
      }
    });

    let numberOfDays = 0;
    ["today", "tomorrow", "afterTomorrow"].forEach((temporality) => {
      if (tableOfKeys.includes(temporality)) {
        if (tableOfKeys.includes("tomorrow")) numberOfDays = 1;
        else if (tableOfKeys.includes("afterTomorrow")) numberOfDays = 2;

        this.tableOfFlags[temporality] = numberOfDays;
      }
    });

    if (tableOfKeys.includes("endMonth")) this.tableOfFlags["endMonth"] = true;
  }

  // ========================================================================== //
  //* whatModele
  /**
   * * Detects the modele
   * @return : object
   */
  whatModel() {
    let modele = { type: "U", value: "undefined" },
      tableOfKeys = Object.keys(this.tableOfFlags),
      size = tableOfKeys.length,
      hasAModele,
      modeleList = ["A", "B"],
      modeleString;

    if (size === 0) return { type: "C", value: "error" };

    for (const index of modeleList) {
      modeleString = "modele" + index;
      for (const property in this[modeleString]) {
        if (size === this[modeleString][property].length) {
          hasAModele = tableOfKeys.reduce((acc, current) => {
            if (this[modeleString][property].includes(current)) {
              acc++;
            }
            return acc;
          }, 0);
          if (hasAModele === size) return { type: index, value: property };
        }
      }
    }

    return modele;
  }

  // ========================================================================== //
  //* tableofFlagsInterpreter
  /**
   * * Associate tableOfFlags with a modele and interprete it, completes the JSON to return
   * @param modele : string: "A","B","C"
   */
  tableOfFlagsInterpreter(modele) {
    let flag,
      newDate = new Date(this.today),
      amountToElapse = 0;

    switch (modele["type"]) {
      case "A":
        {
          if (
            ["day", "week", "month", "year"].some((i) => {
              flag = i;
              return modele["value"] == i;
            })
          ) {
            if (flag == "month") newDate.setMonth(newDate.getMonth() + parseInt(this.tableOfFlags["month"][0]));
            else if (flag == "year") newDate.setFullYear(newDate.getFullYear() + parseInt(this.tableOfFlags["year"][0]));
            else if (flag == "week") newDate.setDate(newDate.getDate() + 7 * parseInt(this.tableOfFlags["week"][0]));
            else newDate.setDate(newDate.getDate() + parseInt(this.tableOfFlags["day"][0]));

            newDate = new Date(newDate);
          }

          if (
            ["weekDays", "monthNames"].some((i) => {
              flag = i;
              return modele["value"] == i;
            })
          ) {
            if (flag == "weekDays" && this.tableOfFlags["weekDays"].length == 1) {
              amountToElapse = Math.abs((newDate.getDay() - this.tableOfFlags["weekDays"][0] - 7) % 7) || 7;
              newDate.setDate(newDate.getDate() + amountToElapse);
            } else if (flag == "monthNames" && this.tableOfFlags.monthNames.monthsIndexes.length == 1) {
              amountToElapse = Math.abs((newDate.getMonth() - this.tableOfFlags.monthNames.monthsIndexes[0] - 12) % 12) || 12;
              newDate.setDate(1);
              newDate.setMonth(newDate.getMonth() + amountToElapse);

              if (this.tableOfFlags.monthNames.monthNum.length <= 2) {
                this.tableOfFlags.monthNames.monthNum.forEach((monthNum) => {
                  newDate.setDate(monthNum < 31 ? monthNum : newDate.getDate()!=1 ? newDate.getDate() : 1);
                  newDate.setFullYear(monthNum > newDate.getFullYear() ? monthNum : newDate.getFullYear());
                });
              }
            }
            newDate = new Date(newDate);
          }

          if (
            ["tomorrow", "afterTomorrow", "today"].some((i) => {
              flag = i;
              return modele["value"] == i;
            })
          ) {
            newDate = new Date(newDate.setDate(newDate.getDate() + this.tableOfFlags[flag]));
          }

          if (modele["value"] == "endMonth") {
            newDate = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0);
          }

          this.schedule.sch = { date: this.toFormattedDate(newDate), mode: "d", appear: 1 };
          this.schedule.schType = "once";
        }
        break;
      case "B":
        {
          switch (modele.value) {
            case "everyWeekDays":
              {
                let weekdaysArray = new Set(this.tableOfFlags.weekDays.map((wd) => ++wd));
                weekdaysArray = Array.from(weekdaysArray).sort();

                this.schedule.schType = "reset";
                this.schedule.sch = { dow: weekdaysArray, schType: "reset", mode: "w", appear: 1 };
              }
              break;
            case "everyMonth":
              {
                let monthsArray = new Set(this.tableOfFlags.month);

                monthsArray = Array.from(monthsArray);
                monthsArray = monthsArray.map((x) => parseInt(x));

                monthsArray.sort((a, b) => a - b);

                this.schedule.schType = "reset";
                this.schedule.sch = { daynNum: monthsArray, schType: "reset", mode: "m", appear: 1 };
              }
              break;
            case "everyDay":
              {
                this.schedule.schType = "reset";
                this.schedule.sch = { dow: [0, 1, 2, 3, 4, 5, 6], schType: "reset", mode: "w", appear: 1 };
              }
              break;
            case "everyWeek":
              {
                this.schedule.schType = "reset";
                this.schedule.sch = { dow: [1], schType: "reset", mode: "w", appear: 1 };
              }
              break;
          }
        }
        break;
    }
  }
}

export { Plan2JSON };
