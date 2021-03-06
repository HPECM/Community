﻿# Sample Addin to replace tags with Record properties
This add-in will read the title string and replace any properties surrounded with angle brackets with their equivalent property or field value.  For example the title "this is a record by &lt;Author>" will be replaced by "this is a record by David".

# Finding the property Ids
This [table](https://content-manager-sdk.github.io/Community/93/property_definition_metadata.html#property_definitions_Record) lists all the properties, use the Id without the 'Record' prefix (e.g. &lt;Author> will be replaced with the Record Author property).


## Setup
To use this sample:
 - build then copy SampleAddin.dll to your EXE directory (the directory where trim.exe resides),
 - in the native client go to Administration > External Links,
 - add a 'New generic add-in (.Net) (see image 1),
 - select which object types this addin should be used by

## Configuration
The add-in pre-populates the record title with the text 'Include properties using elements such as &lt;Author> &lt;Address> or &lt;DateCreated>.'.  To change this text:
 * create a string type Additional Field
 * do not assign this additional field to an object type
 * name the field 'CustomTitleConfig' (or [RecordTypeName]_CustomTitleConfig if you want different text for different Record Types)
 * enter the default record title text in the Default Value of the Additional Field.
 ![Configuration](config.PNG)


## Download
If you want to download the add-in 'as-is' then you can do that [here](DLL).

### Image 1
![image 1](addin_dialog.PNG)


### Image 2
![image 2](addin_useby.PNG)
