/*
 * Copyright 2009 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package kmlvalidator;

// json_simple imports here.
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

// Standard Java imports here.
import java.io.*;
import java.io.File;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collection;
import javax.servlet.http.*;
import javax.xml.XMLConstants;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.parsers.SAXParser;
import javax.xml.parsers.SAXParserFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.validation.Schema;
import javax.xml.validation.SchemaFactory;
import javax.xml.validation.Validator;
import org.xml.sax.SAXException;
import org.xml.sax.SAXParseException;
import org.xml.sax.helpers.DefaultHandler;

/**
 * This class is a servlet that takes raw KML in HTTP POST requests,
 * runs it through basic XSD validation, and returns the results in the
 * HTTP response as a JSON object of the form:
 *
 * <pre>
 *   { 'status': 'invalid' | 'valid' | 'internal_error',
 *     'errors: [ // optional
 *        'line': <line number>, // optional
 *        'column': <column number>, // optional
 *        'type': 'warning' | 'error' | 'fatal_error',
 *        'message': <message string>
 *     ]
 *   }
 * </pre>
 * 
 * Some of the code has been borrowed from the
 * <a href="http://java.sun.com/j2ee/1.4/docs/tutorial/doc/JAXPDOM8.html">
 * Validating with XML Schema</a> tutorial.
 *
 * @author api.roman.public@gmail.com (Roman Nurik)
 * @version 1.0
 */
public class KmlValidatorServlet extends HttpServlet {
  /**
   * Property URI for schema source
   */
  private static final String JAXP_SCHEMA_SOURCE =
      "http://java.sun.com/xml/jaxp/properties/schemaSource";

  /**
   * Property URI for schema language
   */
  private static final String JAXP_SCHEMA_LANGUAGE =
      "http://java.sun.com/xml/jaxp/properties/schemaLanguage";
  /**
   * Property value for schema language = XSD
   */
  private static final String W3C_XML_SCHEMA =
      "http://www.w3.org/2001/XMLSchema";

  /**
   * Handles POST requests for the servlet.
   */
  public void doPost(HttpServletRequest request, HttpServletResponse response)
      throws IOException {
    // Our response is always JSON.
    response.setContentType("application/json");

    // Create the JSON response objects to be filled in later.
    JSONObject responseObj = new JSONObject();
    JSONArray responseErrors = new JSONArray();

    try {
      // Load XSD files here. Note that the Java runtime should be caching
      // these files.
      Object[] schemas = {
        new URL("http://schemas.opengis.net/kml/2.2.0/atom-author-link.xsd").
            openConnection().getInputStream(),
        new URL("http://schemas.opengis.net/kml/2.2.0/ogckml22.xsd").
            openConnection().getInputStream(),
        new URL("http://code.google.com/apis/kml/schema/kml22gx.xsd").
            openConnection().getInputStream()
      };

      // Create a SAX parser factory (not a DOM parser, we don't need the
      // overhead) and set it to validate and be namespace aware, for
      // we want to validate against multiple XSDs.
      SAXParserFactory parserFactory = SAXParserFactory.newInstance();
      parserFactory.setValidating(true);
      parserFactory.setNamespaceAware(true);

      // Create a SAX parser and prepare for XSD validation.
      SAXParser parser = parserFactory.newSAXParser();
      parser.setProperty(JAXP_SCHEMA_LANGUAGE, W3C_XML_SCHEMA);
      parser.setProperty(JAXP_SCHEMA_SOURCE, schemas);

      // Create a parser handler to trap errors during parse.
      KmlValidatorParserHandler parserHandler = new KmlValidatorParserHandler();

      // Parse the KML and send all errors to our handler.
      parser.parse(request.getInputStream(), parserHandler);

      // Check our handler for validation results.
      if (parserHandler.getErrors().size() > 0) {
        // There were errors, enumerate through them and create JSON objects
        // for each one.
        for (KmlValidationError e : parserHandler.getErrors()) {
          JSONObject error = new JSONObject();

          switch (e.getType()) {
            case KmlValidationError.VALIDATION_WARNING:
              error.put("type", "warning");
              break;

            case KmlValidationError.VALIDATION_ERROR:
              error.put("type", "error");
              break;

            case KmlValidationError.VALIDATION_FATAL_ERROR:
              error.put("type", "fatal_error");
              break;

            default:
              error.put("type", "fatal_error");
          }

          // fill in parse exception details
          SAXParseException innerException = e.getInnerException();
          error.put("message", innerException.getMessage());

          if (innerException.getLineNumber() >= 0)
            error.put("line", innerException.getLineNumber());

          if (innerException.getColumnNumber() >= 0)
            error.put("column", innerException.getColumnNumber());

          // add this error to the list
          responseErrors.add(error);
        }

        // The KML wasn't valid.
        responseObj.put("status", "invalid");
      } else {
        // The KML is valid against the XSDs.
        responseObj.put("status", "valid");
      }
    } catch (SAXException e) {
      // We should never get here due to regular parse errors. This error
      // must've been thrown by the schema factory.
      responseObj.put("status", "internal_error");

      JSONObject error = new JSONObject();
      error.put("type", "fatal_error");
      error.put("message", "Internal error: " + e.getMessage());
      responseErrors.add(error);

    } catch (ParserConfigurationException e) {
      // Internal error at this point.
      responseObj.put("status", "internal_error");

      JSONObject error = new JSONObject();
      error.put("type", "fatal_error");
      error.put("message", "Internal parse error.");
      responseErrors.add(error);
    }

    // If there were errors, add them to the final response JSON object.
    if (responseErrors.size() > 0) {
      responseObj.put("errors", responseErrors);
    }

    // output the JSON object as the HTTP response and append a newline for
    // prettiness
    response.getWriter().print(responseObj);
    response.getWriter().println();
  }
}

/**
 * An intermediate class for storing information about individual exceptions
 * during XSD validation.
 */
class KmlValidationError {
  /**
   * Corresponds to a 'warning' type error. Not very serious.
   */
  public static final int VALIDATION_WARNING = 0;

  /**
   * Corresponds to an 'error' type error. Serious but not fatal.
   */
  public static final int VALIDATION_ERROR = 1;

  /**
   * Corresponds to a 'fatal_error' type error. Serious and fatal.
   * Parsing cannot continue.
   */
  public static final int VALIDATION_FATAL_ERROR = 2;

  /**
   * The inner parse exception, containing line number, message, etc.
   */
  private SAXParseException innerException;

  /**
   * The type of parse error.
   */
  private int type;

  /**
   * Instantiates a new validation error from a thrown parse exception
   * and an error type.
   */
  public KmlValidationError(SAXParseException innerException, int type) {
    this.type = type;
    this.innerException = innerException;
  }

  /**
   * Returns the inner parse exception.
   */
  public SAXParseException getInnerException() {
    return this.innerException;
  }

  /**
   * Returns the parse error type.
   *
   * @see KmlValidationError#VALIDATION_WARNING
   * @see KmlValidationError#VALIDATION_ERROR
   * @see KmlValidationError#VALIDATION_FATAL_ERROR
   */
  public int getType() {
    return type;
  }
}

/**
 * This class is a parser handler that collects all parse errors during
 * XSD validation.
 */
class KmlValidatorParserHandler extends DefaultHandler {
  /**
   * The collection of parse errors.
   */
  private Collection<KmlValidationError> errors;

  /**
   * Instantiates the parser handler.
   */
  public KmlValidatorParserHandler() {
    this.errors = new ArrayList<KmlValidationError>();
  }

  /**
   * Returns the collection of parse errors.
   */
  public Collection<KmlValidationError> getErrors() {
    return this.errors;
  }

  /**
   * Callback for handling a warning-type error.
   */
  public void warning(SAXParseException exception) throws SAXException {
    this.errors.add(new KmlValidationError(
        exception, KmlValidationError.VALIDATION_WARNING));
  }

  /**
   * Callback for handling an error-type error.
   */
  public void error(SAXParseException exception) throws SAXException {
    this.errors.add(new KmlValidationError(
        exception, KmlValidationError.VALIDATION_ERROR));
  }

  /**
   * Callback for handling a fatal-error-type error.
   */
  public void fatalError(SAXParseException exception) throws SAXException {
    this.errors.add(new KmlValidationError(
        exception, KmlValidationError.VALIDATION_FATAL_ERROR));
  }
}
