// Copyright 2012 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Shared generic code for activities and assessments
// requires jQuery (>= 1.7.2)

// Original activity and assessment code written by Maggie Johnson
// Refactored version by Philip Guo


var CHECK_ANSWER_TEXT = 'Check Answer';
var CHECK_ANSWERS_TEXT = 'Check Answers';
var SHOW_ANSWER_TEXT = 'Skip and Show Answer';
var SAVE_ANSWERS_TEXT = 'Save Answers';

var SELECT_ANSWER_PROMPT = 'Please click one of the buttons for your answer.';
var ALL_CORRECT_TEXT = 'All your answers are correct!';
var NUM_CORRECT_TEXT = 'Number of questions you answered correctly';
var YOUR_SCORE_TEXT = 'You received a score on this assessment of';
var LESSONS_TO_REVIEW_TEXT = 'Here are lessons you could review to improve your score';
var PERFECT_SCORE_SAVE_TEXT =
    'Congratulations! Press the \'Save Answers\' button to submit your grade.';
var GENERIC_SAVE_TEXT =
    'Press the \'Save Answers\' button below to save your scores. You can also ' +
    'edit your answers above before clicking \'Save Answers\'.';

// highlight the correct answer
var highlightColor = '#3BB9FF';

var globallyUniqueTag = 0; // each question should have a unique tag

function getFreshTag() {
  globallyUniqueTag++;
  return globallyUniqueTag;
}

// 'choices' is a list of choices, where each element is:
//    [choice label, is correct? (boolean), output when this choice is submitted]
// 'domRoot' is the dom element to append HTML onto
function generateMultipleChoiceQuestion(choices, domRoot) {
  var tag = getFreshTag();
  var radioButtonGroupName = 'q' + tag;

  // create radio buttons
  $.each(choices, function(i, elt) {
    var label = elt[0];
    var isCorrect = elt[1];
    var buttonId = radioButtonGroupName + '-' + i;
    if (isCorrect) {
      domRoot.append(
          '<span class="correct_' + tag + '">' +
          '<input type="radio" name="' + radioButtonGroupName + '" ' +
          'id="' + buttonId + '" value="correct"> ' +
          '<label for="' + buttonId + '">' + label + '</label></span>');
    }
    else {
      domRoot.append('<input type="radio" name="' + radioButtonGroupName + '" ' +
          'id="' + buttonId + '"> ' +
          '<label for="' + buttonId + '">' + label + '</label>');
    }
    domRoot.append('<br>');
  });

  domRoot.append('<br>');
  domRoot.append('<p/><button class="gcb-button gcb-button-primary" ' +
      'id="submit_' + tag + '">' + CHECK_ANSWER_TEXT + '</button>');
  domRoot.append(
      '<p/><textarea style="width: 600px; height: 50px;" readonly="true" ' +
      'id="output_' + tag + '"></textarea>');


  var choiceInputs = $('input[name=' + radioButtonGroupName + ']');

  // clear output and highlighting whenever a checkbox is clicked
  choiceInputs.click(function() {
    $('.correct_' + tag).css('background-color', '');
    $('#output_' + tag).val('');
  });


  // treat enter keypresses in the same way as clicks
  $('#submit_' + tag).keydown(function(e) {
    if (e.keyCode === 13) {
      $(this).trigger('click', true);
      e.preventDefault();
    }
  });

  // check inputs and update output
  $('#submit_' + tag).click(function() {
    var answerChosen = false;
    for (var i = 0; i < choiceInputs.length; i++) {
      var isCorrect = choices[i][1];
      var outputMsg = choices[i][2];

      var isChecked = choiceInputs[i].checked;
      if (isChecked) {
        $('#output_' + tag).val(outputMsg);
        $('#output_' + tag).focus();
        if (isCorrect) {
          $('.correct_' + tag).css('background-color', highlightColor);
        }
        answerChosen = true;
      }
    }

    if (!answerChosen) {
      $('#output_' + tag).val(SELECT_ANSWER_PROMPT);
      $('#output_' + tag).focus();
    }
  });
}

// Generate a collection of multiple choice questions
// 'params' is an object containing parameters
// 'domRoot' is the dom element to append HTML onto
function generateMultipleChoiceGroupQuestion(params, domRoot) {

  // 'questionsList' is an ordered list of questions, where each element is:
  //     {questionHTML: <HTML of question>,
  //      choices: <list of choice labels>,
  //      correctIndex: <index of correct choice>}
  // 'allCorrectOutput' is what to display when ALL of the answers are correct
  // 'someIncorrectOutput' is what to display when not all of the answers are correct
  var questionsList = params.questionsList;
  var allCorrectOutput = params.allCorrectOutput;
  var someIncorrectOutput = params.someIncorrectOutput;

  var used_tags = [];

  // create questions
  $.each(questionsList, function(i, q) {
    var tag = getFreshTag();
    used_tags.push(tag);

    var radioButtonGroupName = 'q' + tag;

    // create question HTML
    domRoot.append(q.questionHTML);
    domRoot.append('<br>');

    // create radio buttons
    $.each(q.choices, function(j, choiceLabel) {
      var buttonId = radioButtonGroupName + '-' + i + '-' + j;
      if (j == q.correctIndex) {
        domRoot.append(
            '<span class="correct_' + tag + '">' +
            '<input type="radio" name="' + radioButtonGroupName + '" ' +
            'id="' + buttonId + '" value="correct"> ' +
            '<label for="' + buttonId + '">' + choiceLabel + '</label></span>');
      }
      else {
        domRoot.append(
            '<input type="radio" name="' + radioButtonGroupName + '" ' +
            'id="' + buttonId + '"> ' +
            '<label for="' + buttonId + '">' + choiceLabel + '</label>');
      }
      domRoot.append('<br>');
    });

    domRoot.append('<p/>');

  });


  var toplevel_tag = getFreshTag();

  domRoot.append(
      '<p/><button class="gcb-button gcb-button-primary" id="submit_' +
      toplevel_tag + '">' + CHECK_ANSWERS_TEXT + '</button>');
  domRoot.append(
      '<p/><textarea style="width: 600px; height: 100px;" readonly="true" ' +
      'id="output_' + toplevel_tag + '"></textarea>');


  // clear output and highlighting for ALL questions whenever any checkbox is clicked
  $.each(questionsList, function(ind, q) {
    var tag = used_tags[ind];
    var radioButtonGroupName = 'q' + tag;
    var choiceInputs = $('input[name=' + radioButtonGroupName + ']');

    choiceInputs.click(function() {
      $.each(used_tags, function(i, t) {
        $('.correct_' + t).css('background-color', '');
      });
      $('#output_' + toplevel_tag).val('');
    });
  });


  // treat enter keypresses in the same way as clicks
  $('#submit_' + toplevel_tag).keydown(function(e) {
    if (e.keyCode === 13) {
      $(this).trigger('click', true);
      e.preventDefault();
    }
  });

  // handle question submission
  $('#submit_' + toplevel_tag).click(function() {
    var numCorrect = 0;

    $.each(questionsList, function(ind, q) {
      var tag = used_tags[ind];
      var radioButtonGroupName = 'q' + tag;
      var choiceInputs = $('input[name=' + radioButtonGroupName + ']');

      for (var i = 0; i < choiceInputs.length; i++) {
        var isChecked = choiceInputs[i].checked;
        if (isChecked && (i == q.correctIndex)) {
          numCorrect++;
        }
      }
    });

    if (numCorrect == questionsList.length) {
      $.each(used_tags, function(i, t) {
        $('.correct_' + t).css('background-color', highlightColor);
      });
      $('#output_' + toplevel_tag).val(
          ALL_CORRECT_TEXT + ' ' + allCorrectOutput);
      $('#output_' + toplevel_tag).focus();
    }
    else {
      $('#output_' + toplevel_tag).val(
          NUM_CORRECT_TEXT + ': ' + numCorrect + '/' + questionsList.length +
          '.\n\n' + someIncorrectOutput);
      $('#output_' + toplevel_tag).focus();
    }
  });
}

// 'params' is an object containing parameters (some optional)
// 'domRoot' is the dom element to append HTML onto
function generateFreetextQuestion(params, domRoot) {

  // 'correctAnswerRegex' is a regular expression that matches the correct answer
  // 'correctAnswerOutput' and 'incorrectAnswerOutput' are what to display
  // when the checked answer is correct or not. If those are both null,
  // then don't generate a 'Check Answer' button.
  // 'showAnswerOutput' is what to display when the user clicks the 'Skip &
  // Show Answer' button (if null, then don't display that option).
  var correctAnswerRegex = params.correctAnswerRegex;
  var correctAnswerOutput = params.correctAnswerOutput;
  var incorrectAnswerOutput = params.incorrectAnswerOutput;
  var showAnswerOutput = params.showAnswerOutput;
  var showAnswerPrompt = params.showAnswerPrompt || SHOW_ANSWER_TEXT; // optional parameter
  var outputHeight = params.outputHeight || '50px'; // optional parameter


  var tag = getFreshTag();

  domRoot.append(
      '&nbsp;&nbsp;<input type="text" style="width: 400px; ' +
      'class="alphanumericOnly" id="input_' + tag + '">');
  if (correctAnswerOutput && incorrectAnswerOutput) {
    domRoot.append('<p/><button class="gcb-button gcb-button-primary" ' +
        'id="submit_' + tag + '">' + CHECK_ANSWER_TEXT + '</button>');
  }
  if (showAnswerOutput) {
    domRoot.append(
        '<p/><button class="gcb-button gcb-button-primary" ' +
        'id="skip_and_show_' + tag + '">' +
        showAnswerPrompt + '</button>');
  }
  domRoot.append(
      '<p/><textarea style="width: 600px; height: ' + outputHeight + ';" ' +
      'readonly="true" id="output_' + tag + '"></textarea>');


  // we need to wait until ALL elements are in the DOM before binding event handlers

  $('#input_' + tag).focus(function() {
    $('#output_' + tag).val('');
  });

  if (correctAnswerOutput && incorrectAnswerOutput) {
    // treat enter keypresses in the same way as clicks
    $('#submit_' + tag).keydown(function(e) {
      if (e.keyCode === 13) {
        $(this).trigger('click', true);
        e.preventDefault();
      }
    });

    $('#submit_' + tag).click(function() {
      var textValue = $('#input_' + tag).val();
      textValue = textValue.replace(/^\s+/,''); //trim leading spaces
      textValue = textValue.replace(/\s+$/,''); //trim trailing spaces

      var isCorrect = correctAnswerRegex.test(textValue);
      if (isCorrect) {
        $('#output_' + tag).val(correctAnswerOutput);
        $('#output_' + tag).focus();
      }
      else {
        $('#output_' + tag).val(incorrectAnswerOutput);
        $('#output_' + tag).focus();
      }
    });
  }

  if (showAnswerOutput) {
    $('#skip_and_show_' + tag).click(function() {
      $('#output_' + tag).val(showAnswerOutput);
      $('#output_' + tag).focus();
    });
  }
}

// Takes a list of HTML element strings and special question objects and renders
// HTML onto domRoot
//
// The main caveat here is that each HTML string must be a FULLY-FORMED HTML
// element that can be appended wholesale to the DOM, not a partial element.
function renderActivity(contentsLst, domRoot) {
  $.each(contentsLst, function(i, e) {
    if (typeof e == 'string') {
      domRoot.append(e);
    } else {
      // dispatch on type:
      if (e.questionType == 'multiple choice') {
        generateMultipleChoiceQuestion(e.choices, domRoot);
      }
      else if (e.questionType == 'multiple choice group') {
        generateMultipleChoiceGroupQuestion(e, domRoot);
      }
      else if (e.questionType == 'freetext') {
        generateFreetextQuestion(e, domRoot);
      }
      else {
        alert('Error in renderActivity: e.questionType is not in ' +
              '{\'multiple choice\', \'multiple choice group\', \'freetext\'}');
      }
    }
  });
}

// Takes a special 'assessment' object and renders it as HTML under domRoot
function renderAssessment(assessment, domRoot) {
  // first surround everything with a form
  domRoot.html('<form name="assessment"></form>');
  domRoot = domRoot.find('form');

  if (assessment.preamble) {
    domRoot.append(assessment.preamble);
  }

  domRoot.append('<ol></ol>');

  var questionsOL = domRoot.find('ol');

  $.each(assessment.questionsList, function(questionNum, q) {
    questionsOL.append('<li></li>');

    var curLI = questionsOL.find('li:last');
    curLI.append(q.questionHTML);
    curLI.append('<p/>');

    // Dispatch to specialized handler depending on the existence of particular fields:
    //   choices              - multiple choice question (with exactly one correct answer)
    //   correctAnswerString  - case-insensitive substring match
    //   correctAnswerRegex   - freetext regular expression match
    //   correctAnswerNumeric - freetext numeric match
    if (q.choices) {
      $.each(q.choices, function(i, c) {
        var buttonId = 'q' + questionNum + '-' + i;
        if (typeof c == 'string') {
          // incorrect choice
          curLI.append('<input type="radio" name="q' + questionNum + '" id="' +
              buttonId + '">&nbsp;<label for="' + buttonId + '">' + c + '</label><br>');
        }
        else {
          // wrapped in correct() ...
          if (c[0] != 'correct') {
            alert('Error: Malformed question.');
          }
          // correct choice
          curLI.append('<input type="radio" name="q' + questionNum + '" id="' +
              buttonId + '" value="correct">&nbsp;<label for="' + buttonId + '">' +
              c[1] + '</label><br>');
        }
      });
    } else if (q.correctAnswerString || q.correctAnswerRegex || q.correctAnswerNumeric) {
      curLI.append('Answer:&nbsp;&nbsp;<input type="text" class="alphanumericOnly" ' +
          'style="border-style: solid; border-color: black; border-width: 1px;" ' +
          'id="q' + questionNum + '">');
    } else {
      alert('Error: Invalid question type.');
    }

    curLI.append('<br><br>');
  });


  if (assessment.checkAnswers) {
    domRoot.append(
        '<button type="button" class="gcb-button gcb-button-primary" id="checkAnswersBtn">' +
        CHECK_ANSWERS_TEXT + '</button><p/>');
    domRoot.append('<p/><textarea style="width: 600px; height: 120px;" ' +
        'readonly="true" id="answerOutput"></textarea>');
  }
  domRoot.append(
      '<br><button type="button" class="gcb-button gcb-button-primary" id="submitAnswersBtn">' +
      SAVE_ANSWERS_TEXT + '</button>');


  function checkOrSubmitAnswers(submitAnswers) {
    $('#answerOutput').html('');

    var scoreArray = [];
    var lessonsToRead = [];

    $.each(assessment.questionsList, function(questionNum, q) {
      var isCorrect = false;

      if (q.choices) {
        isCorrect = checkQuestionRadioSimple(
            document.assessment['q' + questionNum]);
      }
      else if (q.correctAnswerString) {
        var answerVal = $('#q' + questionNum).val();
        answerVal = answerVal.replace(/^\s+/,''); // trim leading spaces
        answerVal = answerVal.replace(/\s+$/,''); // trim trailing spaces

        isCorrect = (
            answerVal.toLowerCase() == q.correctAnswerString.toLowerCase());
      }
      else if (q.correctAnswerRegex) {
        var answerVal = $('#q' + questionNum).val();
        answerVal = answerVal.replace(/^\s+/,''); // trim leading spaces
        answerVal = answerVal.replace(/\s+$/,''); // trim trailing spaces

        isCorrect = q.correctAnswerRegex.test(answerVal);
      }
      else if (q.correctAnswerNumeric) {
        // allow for some small floating-point leeway
        var answerNum = parseFloat($('#q' + questionNum).val());
        var EPSILON = 0.001;

        if ((q.correctAnswerNumeric - EPSILON <= answerNum) &&
            (answerNum <= q.correctAnswerNumeric + EPSILON)) {
          isCorrect = true;
        }
      }

      scoreArray.push(isCorrect);

      if (!isCorrect && q.lesson) {
        lessonsToRead.push(q.lesson);
      }
    });


    var numQuestions = assessment.questionsList.length;

    var numCorrect = 0;
    $.each(scoreArray, function(i, e) {
      if (e) {
        numCorrect++;
      }
    });

    var score = ((numCorrect / numQuestions) * 100).toFixed(2);


    if (submitAnswers) {
      // create a new hidden form, submit it via POST, and then delete it

      var myForm = document.createElement('form');
      myForm.method = 'post';

      // defaults to 'answer', which invokes AnswerHandler in ../../controllers/lessons.py
      myForm.action = assessment.formScript || 'answer';

      var assessmentType = assessment.assessmentName || 'unnamed assessment';

      var myInput = null;

      myInput= document.createElement('input');
      myInput.setAttribute('name', 'assessment_type');
      myInput.setAttribute('value', assessmentType);
      myForm.appendChild(myInput);

      // create a form entry for each question/result pair
      $.each(scoreArray, function(i, val) {
        myInput = document.createElement('input');
        myInput.setAttribute('name', i);
        myInput.setAttribute('value', val);
        myForm.appendChild(myInput);
      });

      myInput = document.createElement('input');
      myInput.setAttribute('name', 'num_correct');
      myInput.setAttribute('value', numCorrect);
      myForm.appendChild(myInput);

      myInput = document.createElement('input');
      myInput.setAttribute('name', 'num_questions');
      myInput.setAttribute('value', numQuestions);
      myForm.appendChild(myInput);

      myInput = document.createElement('input');
      myInput.setAttribute('name', 'score');
      myInput.setAttribute('value', score);
      myForm.appendChild(myInput);

      document.body.appendChild(myForm);
      myForm.submit();
      document.body.removeChild(myForm);
    } else {
      // display feedback without submitting any data to the backend

      var outtext = YOUR_SCORE_TEXT + " " + score + '% (' + numCorrect + '/' +
          numQuestions + ').\n\n';

      if (lessonsToRead.length > 0) {
        outtext += LESSONS_TO_REVIEW_TEXT + ': ' + lessonsToRead.join(', ') +
            '\n\n';
      }

      outtext += (score >= 100 ? PERFECT_SCORE_SAVE_TEXT : GENERIC_SAVE_TEXT);
      $('#answerOutput').html(outtext);
    }
  }

  $('#checkAnswersBtn').click(function() {
      checkOrSubmitAnswers(false);
  });
  $('#submitAnswersBtn').click(function() {
      checkOrSubmitAnswers(true);
  });
}

// wrap the value with a 'correct' tag
function correct(choiceStr) {
  return ['correct', choiceStr];
}

// check a radio button answer - simple; return 1 if correct button checked
function checkQuestionRadioSimple(radioGroup) {
  for (var i = 0; i < radioGroup.length; i++) {
    if (radioGroup[i].checked) {
      return radioGroup[i].value == 'correct';
    }
  }
  return false;
}

function checkText(id, regex) {
  var textValue = document.getElementById(id).value;
  textValue = textValue.replace(/^\s+/,''); // trim leading spaces
  textValue = textValue.replace(/\s+$/,''); // trim trailing spaces
  return regex.test(textValue);
}

// this code runs when the document fully loads:
$(document).ready(function() {
  // render the activity specified in the 'var activity' top-level variable
  // (if it exists)
  if (typeof activity != 'undefined') {
    renderActivity(activity, $('#activityContents'));
  }
  // or render the assessment specified in the 'var assessment' top-level
  // variable (if it exists)
  else if (typeof assessment != 'undefined') {
    renderAssessment(assessment, $('#assessmentContents'));
  }

  // disable enter key on textboxes
  function stopRKey(evt) {
    var evt  = evt || (event || null);
    var node = evt.target || (evt.srcElement || null);
    if ((evt.keyCode == 13) && (node.type=='text')) {
      return false;
    }
  }
  $(document).keypress(stopRKey);
});
