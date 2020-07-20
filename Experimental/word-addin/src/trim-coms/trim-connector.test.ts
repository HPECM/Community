(global as any).config = { BASE_URL: "", SERVICEAPI_PATH: "ServiceAPI" };
import BaseObjectTypes from "../trim-coms/trim-baseobjecttypes";
import {
	IRecordType,
	SERVICEAPI_BASE_URI,
	TrimConnector,
	IClassification,
	ITrimMainObject,
	ICheckinPlace,
	IOutlookUserOptions,
} from "./trim-connector";
import MockAdapter from "axios-mock-adapter";
import TrimMessages from "./trim-messages";
import CommandIds from "./trim-command-ids";
import { AssertionError } from "assert";
import flushPromises = require("flush-promises");
import { PropertySetTypes } from "./PropertySetTypes";

//import * as fetchMock from "fetch-mock";

const axios = require("axios");
//const MockAdapter = require("axios-mock-adapter");

const mock = new MockAdapter(axios);

describe("Test makeFriendlySearchQuery", () => {
	const trimConnector = new TrimConnector();
	trimConnector.credentialsResolver = (callback) => {
		callback("token123", "");
	};

	it("shortcut for Records", () => {
		expect.assertions(1);

		let query = trimConnector.makeFriendlySearchQuery(
			BaseObjectTypes.Record,
			"test"
		);

		expect(query).toEqual("recAnyWord:test* OR recNumber:test*");
	});

	it("shortcut for Locations", () => {
		expect.assertions(1);

		let query = trimConnector.makeFriendlySearchQuery(
			BaseObjectTypes.Location,
			"test"
		);

		expect(query).toEqual(
			"locGivenNames:test* OR locSortName:test* OR locLogin:test*"
		);
	});

	it("shortcut for Other", () => {
		expect.assertions(1);

		let query = trimConnector.makeFriendlySearchQuery(
			BaseObjectTypes.RecordType,
			"test"
		);

		expect(query).toEqual("test*");
	});

	it("shortcut for Classification", () => {
		expect.assertions(1);

		let query = trimConnector.makeFriendlySearchQuery(
			BaseObjectTypes.Classification,
			"test"
		);

		expect(query).toEqual("plnWord:test* OR plnTitle:test*");
	});
});

describe("Test fetch from TRIM", () => {
	const trimConnector = new TrimConnector();
	trimConnector.credentialsResolver = (callback) => {
		callback("token123", "");
	};

	it("Record Types are returned", () => {
		let props: string = "";
		mock
			.onGet(`${SERVICEAPI_BASE_URI}/RecordType`, {
				params: {
					q: "all",
					properties: "NameString,PossiblyHasSubordinates,Icon",
					purpose: 3,
					pageSize: 30,
					start: 1,
					ExcludeCount: true,
					ApplyDefaults: true,
					HideCustomRecordTypes: true,
				},
			})
			.reply(function (config: any) {
				props = config.params.properties;

				return [
					200,
					{
						Results: [{ NameString: "Document", Uri: 1 }],
					},
				];
			});

		expect.assertions(2);
		return trimConnector
			.search<IRecordType>({
				trimType: BaseObjectTypes.RecordType,
				q: "all",
				purpose: 3,
			})
			.then((data) => {
				expect(props).toEqual("NameString,PossiblyHasSubordinates,Icon");
				expect(data.results[0].NameString).toBe("Document");
			});
	});

	it("Checkin Places are returned", () => {
		let props: string = "";
		mock
			.onGet(`${SERVICEAPI_BASE_URI}/CheckinPlace`, {
				params: {
					q: "all",
					properties: "NameString,CheckinAs,Icon",
					pageSize: 30,
					purpose: 0,
					start: 1,
					ExcludeCount: true,
					ApplyDefaults: true,
				},
			})
			.reply(function (config: any) {
				props = config.params.properties;

				return [
					200,
					{
						Results: [
							{ NameString: "place 1", Uri: 1, CheckinAs: { Uri: 11 } },
						],
					},
				];
			});

		expect.assertions(2);
		return trimConnector
			.search<ICheckinPlace>({
				trimType: BaseObjectTypes.CheckinPlace,
				q: "all",
				purpose: 0,
			})
			.then((data) => {
				expect(props).toEqual("NameString,CheckinAs,Icon");
				expect(data.results[0].CheckinAs).toEqual({ Uri: 11 });
			});
	});

	it("passes sort to search", () => {
		let sortBy: string = "";
		mock.onGet(`${SERVICEAPI_BASE_URI}/Record`).reply(function (config: any) {
			sortBy = config.params.sortBy;

			return [
				200,
				{
					Results: [{ NameString: "Rec_1", Uri: 1 }],
				},
			];
		});

		expect.assertions(1);
		return trimConnector
			.search<ITrimMainObject>({
				trimType: BaseObjectTypes.Record,
				q: "all",
				purpose: 3,
				sortBy: "registeredOn",
			})
			.then(() => {
				expect(sortBy).toEqual("registeredOn");
			});
	});

	it("passes filter to search", () => {
		let filter: string = "";
		mock.onGet(`${SERVICEAPI_BASE_URI}/Record`).reply(function (config: any) {
			filter = config.params.filter;

			return [
				200,
				{
					Results: [{ NameString: "Rec_1", Uri: 1 }],
				},
			];
		});

		expect.assertions(1);
		return trimConnector
			.search<ITrimMainObject>({
				trimType: BaseObjectTypes.Record,
				q: "all",
				purpose: 3,
				filter: "electronic",
			})
			.then(() => {
				expect(filter).toEqual("electronic");
			});
	});

	it("passes properties", () => {
		let properties: string = "";
		let selectedIds: string = "";
		mock.onGet(`${SERVICEAPI_BASE_URI}/Record`).reply(function (config: any) {
			properties = config.params.properties;
			selectedIds = config.params.cid_SelectedIds;

			return [
				200,
				{
					Results: [{ NameString: "Rec_1", Uri: 1 }],
				},
			];
		});

		expect.assertions(2);
		return trimConnector
			.search<ITrimMainObject>({
				trimType: BaseObjectTypes.Record,
				q: "all",
				purpose: 3,
				properties: "EnabledCommandIds",
				commandFilter: "MakeStopWord,RecAddToCase",
			})
			.then(() => {
				expect(properties.indexOf(",EnabledCommandIds")).toBeGreaterThan(-1);
				expect(selectedIds).toEqual("MakeStopWord,RecAddToCase");
			});
	});

	it("returns success when no results found.", () => {
		mock
			.onGet(`${SERVICEAPI_BASE_URI}/RecordType`, {
				params: {
					q: "all",
					properties: "NameString,PossiblyHasSubordinates,Icon",
					purpose: 3,
					pageSize: 30,
					start: 1,
					purposeExtra: 123,
					ExcludeCount: true,
					ApplyDefaults: true,
					HideCustomRecordTypes: true,
				},
			})
			.reply(function (config: any) {
				return [
					200,
					{
						Results: [],
					},
				];
			});
		expect.assertions(1);

		return trimConnector
			.search<IRecordType>({
				trimType: BaseObjectTypes.RecordType,
				q: "all",
				purpose: 3,
				purposeExtra: 123,
			})
			.then((data) => {
				expect(data.results.length).toBe(0);
			});
	});

	it("the prefix is removed from the property name", () => {
		mock.reset();
		mock.onGet(`${SERVICEAPI_BASE_URI}/Classification`).replyOnce(200, {
			Results: [
				{
					ClassificationName: { Value: "Test Name" },
					PossiblyHasSubordinates: true,
					TrimType: "Classification",
					NameString: "Accounting - Accounting Automatic",
					Uri: 9000000005,
				},
			],
			PropertiesAndFields: {},
			TotalResults: 1,
			CountStringEx: "1 Classification",
			MinimumCount: 1,
			Count: 0,
			HasMoreItems: false,
			SearchTitle:
				"Classifications - parent:9000000004 (Accounting) - 1 Classification",
			HitHighlightString: "",
			TrimType: "Classification",
			ResponseStatus: {},
		});

		expect.assertions(1);
		return trimConnector
			.search<IClassification>({
				trimType: BaseObjectTypes.Classification,
				q: "all",
				purpose: 3,
				purposeExtra: 123,
			})
			.then((data) => {
				expect(data.results[0].Name.Value).toBe("Test Name");
			});
	});

	it("search title is returned", async () => {
		mock.reset();
		mock.onGet(`${SERVICEAPI_BASE_URI}/Classification`).replyOnce(200, {
			Results: [
				{
					ClassificationName: { Value: "Test Name" },
					PossiblyHasSubordinates: true,
					TrimType: "Classification",
					NameString: "Accounting - Accounting Automatic",
					Uri: 9000000005,
				},
			],
			PropertiesAndFields: {},
			TotalResults: 1,
			CountStringEx: "1 Classification",
			MinimumCount: 1,
			Count: 0,
			HasMoreItems: false,
			SearchTitle: "test title",
			HitHighlightString: "",
			TrimType: "Classification",
			ResponseStatus: {},
		});

		expect.assertions(1);

		const data = await trimConnector.search<IClassification>({
			trimType: BaseObjectTypes.Classification,
			q: "all",
			purpose: 3,
			purposeExtra: 123,
		});

		expect(data.SearchTitle).toBe("test title");
	});

	it("the FullFormattedName is david", () => {
		mock.reset();
		mock.onGet(`${SERVICEAPI_BASE_URI}/Location/me`).replyOnce(200, {
			Results: [{ LocationFullFormattedName: { Value: "david" } }],
		});

		expect.assertions(1);
		return trimConnector.getMe().then((data) => {
			expect(data.FullFormattedName.Value).toBe("david");
		});
	});

	it("does not send a body with a GET", async () => {
		mock.reset();
		let body = {};
		mock
			.onGet(`${SERVICEAPI_BASE_URI}/Location/me`)
			.replyOnce(function (config: any) {
				body = config.data;

				return [
					200,
					{
						Results: [{ LocationFullFormattedName: { Value: "david" } }],
					},
				];
			});

		await trimConnector.getMe();
		expect(body).toBeUndefined();
	});

	it("Application name is Content Manager", async () => {
		let messageMatch: string = "";

		mock
			.onGet(`${SERVICEAPI_BASE_URI}/Localisation`)
			.reply(function (config: any) {
				messageMatch = config.params.MatchMessages;
				return [
					200,
					{
						Messages: { web_HPRM: "Content Manager" },
						ResponseStatus: {},
					},
				];
			});

		expect.assertions(2);
		const data = await trimConnector.getMessages();
		expect(data.web_HPRM).toBe("Content Manager");
		expect(messageMatch).toEqual(Object.keys(new TrimMessages()).join("|"));
	});

	it("Property sheet requested from Record Type", () => {
		let postConfig: any;
		mock.onPost(`${SERVICEAPI_BASE_URI}/Record`).reply(function (config: any) {
			postConfig = config;

			return [
				200,
				{
					Results: [
						{
							TrimType: "RecordType",
							DataEntryFormDefinition: {
								Version: "1",
								SupportsElectronicDocs: true,
								TitlingMethod: "FreeText",
								Pages: [{}],
							},
						},
					],
				},
			];
		});

		expect.assertions(2);
		return trimConnector
			.getPropertySheet(BaseObjectTypes.Record, 123)
			.then((data) => {
				expect(data.DataEntryFormDefinition.Pages.length).toBe(1);
				expect(postConfig.RecordFilePath).toBeFalsy();
			});
	});

	it("Property sheet with document", () => {
		let postConfig: any;
		mock.reset();
		mock.onPost(`${SERVICEAPI_BASE_URI}/Record`).reply(function (config: any) {
			postConfig = config;
			return [
				200,
				{
					Results: [
						{
							TrimType: "RecordType",
							DataEntryFormDefinition: {
								Version: "1",
								SupportsElectronicDocs: true,
								TitlingMethod: "FreeText",
								Pages: [{}],
							},
						},
					],
				},
			];
		});

		expect.assertions(2);
		return trimConnector
			.getPropertySheet(BaseObjectTypes.Record, 123, "myfile.eml")
			.then((data) => {
				expect(data.DataEntryFormDefinition.Pages.length).toBe(1);
				expect(JSON.parse(postConfig.data).RecordFilePath).toBe("myfile.eml");
			});
	});

	it("Property sheet requested for Checkin Style", () => {
		let postConfig: any;
		mock
			.onPost(`${SERVICEAPI_BASE_URI}/CheckinStyle`)
			.reply(function (config: any) {
				postConfig = config;

				return [
					200,
					{
						Results: [
							{
								TrimType: "CheckinStyle",
								DataEntryFormDefinition: {
									Version: "1",
									SupportsElectronicDocs: true,
									TitlingMethod: "FreeText",
									Pages: [{}],
								},
							},
						],
					},
				];
			});

		expect.assertions(4);
		return trimConnector
			.getPropertySheet(BaseObjectTypes.CheckinStyle, 123)
			.then((data) => {
				expect(data.DataEntryFormDefinition.Pages.length).toBe(1);
				expect(JSON.parse(postConfig.data).CheckinStyleRecordType).toBe(123);
				expect(JSON.parse(postConfig.data).ByPassSave).toBeTruthy();
				expect(JSON.parse(postConfig.data).properties).toBe(
					"DataEntryFormDefinition,NeedsDataEntryForm"
				);
			});
	});

	it("Property sheet requested for Record based on Checkin Style", () => {
		let postConfig: any;
		mock.onPost(`${SERVICEAPI_BASE_URI}/Record`).reply(function (config: any) {
			postConfig = config;
			return [
				200,
				{
					Results: [
						{
							TrimType: "RecordType",
							DataEntryFormDefinition: {
								Version: "1",
								SupportsElectronicDocs: true,
								TitlingMethod: "FreeText",
								Pages: [{}],
							},
						},
					],
				},
			];
		});

		expect.assertions(4);
		return trimConnector.getPropertySheetFromStyle(123).then((data) => {
			expect(data.DataEntryFormDefinition.Pages.length).toBe(1);
			expect(JSON.parse(postConfig.data).CreateFromCheckinStyle).toBe(123);
			expect(JSON.parse(postConfig.data).ByPassSave).toBeTruthy();
			expect(JSON.parse(postConfig.data).properties).toBe(
				"DataEntryFormDefinition,NeedsDataEntryForm"
			);
		});
	});

	it("Error is handled", () => {
		//mock.reset();
		mock.onPost(`${SERVICEAPI_BASE_URI}/Record`).reply(500, {
			Count: 0,
			HasMoreItems: false,
			MinimumCount: 0,
			PropertiesAndFields: {},
			ResponseStatus: {
				ErrorCode: "ApplicationException",
				Errors: [],
				Message: "Unable to find object test",
			},
			Results: [],
			TotalResults: 0,
			TrimType: "Location",
		});

		expect.assertions(1);

		return trimConnector
			.getPropertySheet(BaseObjectTypes.Record, 567)
			.then(() => {})
			.catch((data) => {
				expect(data.message).toBe("Unable to find object test");
			});
	});

	it("Error is handled on Get me", () => {
		//mock.reset();
		mock.onGet(`${SERVICEAPI_BASE_URI}/Location/me`).reply(500, {
			Count: 0,
			HasMoreItems: false,
			MinimumCount: 0,
			PropertiesAndFields: {},
			ResponseStatus: {
				ErrorCode: "ApplicationException",
				Errors: [],
				Message: "Unable to find object test",
			},
			Results: [],
			TotalResults: 0,
			TrimType: "Location",
		});

		expect.assertions(1);

		return trimConnector
			.getMe()
			.then(() => {})
			.catch((data) => {
				// expect(appStore.status).toBe("ERROR");
				expect(data.message).toBe("Unable to find object test");
			});
	});

	it("has posted a new Record", () => {
		let postConfig: any;
		mock.onPost(`${SERVICEAPI_BASE_URI}/Record`).reply(function (config: any) {
			postConfig = config;

			return [
				200,
				{
					Results: [
						{
							Uri: 123,
						},
					],
				},
			];
		});

		expect.assertions(4);

		return trimConnector
			.saveToTrim(BaseObjectTypes.Record, {
				RecordTypedTitle: "test",
				RecordRecordType: 1,
			})
			.then((data) => {
				expect(postConfig.data).toEqual(
					JSON.stringify({
						RecordTypedTitle: "test",
						RecordRecordType: 1,
						properties: "CommandDefs,URN",
					})
				);
				expect(postConfig.headers!["Accept"]).toEqual("application/json");
				expect(postConfig.headers!["Content-Type"]).toEqual("application/json");
				expect(data.Uri).toEqual(123);
			});
	});

	it("has posted a new Checkin Style", () => {
		let postConfig: any;
		mock
			.onPost(`${SERVICEAPI_BASE_URI}/CheckinStyle`)
			.reply(function (config: any) {
				postConfig = config;

				return [
					200,
					{
						Results: [
							{
								Uri: 123,
							},
						],
					},
				];
			});

		expect.assertions(4);

		return trimConnector
			.saveToTrim(BaseObjectTypes.CheckinStyle, {
				CheckinStyleName: "test",
			})
			.then((data) => {
				expect(postConfig.data).toEqual(
					JSON.stringify({
						CheckinStyleName: "test",
						properties: "CommandDefs,URN",
					})
				);
				expect(postConfig.headers!["Accept"]).toEqual("application/json");
				expect(postConfig.headers!["Content-Type"]).toEqual("application/json");
				expect(data.Uri).toEqual(123);
			});
	});

	it("has posted a new Record with field values", () => {
		let postConfig: any;
		mock.onPost(`${SERVICEAPI_BASE_URI}/Record`).reply(function (config: any) {
			postConfig = config;

			return [
				200,
				{
					Results: [
						{
							Uri: 123,
							URN: "trim:N1/rec/123",
						},
					],
				},
			];
		});

		expect.assertions(5);

		return trimConnector
			.saveToTrim(
				BaseObjectTypes.Record,
				{
					RecordTypedTitle: "test",
					RecordRecordType: 1,
					RecordExternalEditorId: "test",
				},
				{}
			)
			.then((data) => {
				expect(postConfig.data).toEqual(
					JSON.stringify({
						RecordTypedTitle: "test",
						RecordRecordType: 1,
						RecordExternalEditorId: "test",
						properties: "CommandDefs,URN",
						Fields: {},
					})
				);
				expect(postConfig.headers!["Accept"]).toEqual("application/json");
				expect(postConfig.headers!["Content-Type"]).toEqual("application/json");
				expect(data.Uri).toEqual(123);
				expect(data.URN).toEqual("trim:N1/rec/123");
			});
	});

	[
		{ get: PropertySetTypes.ViewPane },
		{ get: PropertySetTypes.DataGrid },
	].forEach((testData) => {
		it(`"get ${testData.get} property defs`, () => {
			let postConfig: any;

			mock
				.onGet(`${SERVICEAPI_BASE_URI}/PropertyDef`)
				.replyOnce(function (config: any) {
					postConfig = config;

					return [
						200,
						{
							PropertiesAndFields: [
								{
									Id: "RecordTitle",
									IsEMailAddress: false,
									IsHyperlink: false,
									DefaultColumnCharacters: 20,
									ColumnWidth: 134,
									IsDefaultDataGridColumn: true,
									BestFitColumn: false,
									IconAndOrTextMode: "IconAndText",
									StringAlignment: "Left",
									SortMode: "AlphaNoCase",
									Caption: "Title",
									ObjectType: "Unknown",
									PFFormat: "String",
									Property: {},
									PropertyId: "RecordTitle",
									IsAField: false,
									IsAProperty: true,
									IsMandatory: false,
								},
							],
							ResponseStatus: {},
						},
					];
				});

			expect.assertions(2);

			return trimConnector
				.getViewPanePropertyDefs(BaseObjectTypes.Record, testData.get)
				.then((data) => {
					expect(postConfig.params).toEqual({
						TrimType: "Record",
						Get: testData.get,
					});
					expect(postConfig.headers!["Accept"]).toEqual("application/json");
				});
		});
	});
	it("has updated view pane properties", () => {
		let postConfig: any;
		mock
			.onPost(`${SERVICEAPI_BASE_URI}/PropertyDef`)
			.reply(function (config: any) {
				postConfig = config;

				return [
					200,
					{
						PropertiesAndFields: [
							{
								Id: "RecordTitle",
								IsEMailAddress: false,
								IsHyperlink: false,
								DefaultColumnCharacters: 20,
								ColumnWidth: 134,
								IsDefaultDataGridColumn: true,
								BestFitColumn: false,
								IconAndOrTextMode: "IconAndText",
								StringAlignment: "Left",
								SortMode: "AlphaNoCase",
								Caption: "Title",
								ObjectType: "Unknown",
								PFFormat: "String",
								Property: {},
								PropertyId: "RecordTitle",
								IsAField: false,
								IsAProperty: true,
								IsMandatory: false,
							},
						],
						ResponseStatus: {},
					},
				];
			});

		expect.assertions(3);

		return trimConnector
			.setViewPaneProperties({ Uri: 1, TrimType: BaseObjectTypes.Record }, [
				"RecordTitle",
			])
			.then((data) => {
				expect(postConfig.data).toEqual(
					JSON.stringify({
						TrimType: "Record",
						ForObject: 1,
						PropertiesAndFields: [{ Id: "RecordTitle" }],
						ListType: "Detailed",
					})
				);
				expect(postConfig.headers!["Accept"]).toEqual("application/json");
				expect(postConfig.headers!["Content-Type"]).toEqual("application/json");
			});
	});

	it("get global user options", () => {
		let postConfig: any;
		mock
			.onPost(`${SERVICEAPI_BASE_URI}/UserOptions/ViewPane`)
			.reply(function (config: any) {
				postConfig = config;

				return [
					200,
					{
						UserOptions: {
							__type:
								"HP.HPTRIM.ServiceModel.ViewPaneUserOptions, HP.HPTRIM.ServiceAPI.Model",
							LoadFromGlobalSetting: false,
							SaveAsGlobalSetting: false,
						},
						ResponseStatus: {},
					},
				];
			});

		expect.assertions(3);

		return trimConnector.setGlobalUserOptions("ViewPane").then((data) => {
			expect(postConfig.data).toEqual(
				JSON.stringify({
					LoadFromGlobalSetting: true,
				})
			);
			expect(postConfig.headers!["Accept"]).toEqual("application/json");
			expect(postConfig.headers!["Content-Type"]).toEqual("application/json");
		});
	});

	it("cancelled the request", async () => {
		let postConfig: any;
		mock.onPost(`${SERVICEAPI_BASE_URI}/Record`).reply(function (config: any) {
			postConfig = config;
			setTimeout(() => {}, 10);
			return [
				200,
				{
					Results: [
						{
							Uri: 123,
						},
					],
				},
			];
		});

		let completed = false;

		trimConnector
			.search<IRecordType>({
				trimType: BaseObjectTypes.RecordType,
				q: "all",
				purpose: 3,
			})

			.then((data) => {
				completed = true;
			});
		trimConnector.cancel();

		await flushPromises();
		expect(completed).toBe(false);
	});

	it("sends the token with a request", () => {
		let token = "";
		let webUrl = "";
		mock
			.onGet(`${SERVICEAPI_BASE_URI}/DriveItem`)
			.reply(function (config: any) {
				token = config.headers["Authorization"];
				webUrl = config.params["Url"];

				return [200, { DriveItems: [{ Id: "0123", Uris: [567] }] }];
			});

		expect.assertions(4);
		return trimConnector.getDriveId("abc", 0).then((data) => {
			expect(webUrl).toEqual("abc");
			expect(data.Id).toEqual("0123");
			expect(data.Uris).toEqual([567]);
			expect(token).toEqual("Bearer token123");
		});
	});

	it("sends the attachment name", () => {
		let attachmentName = "";
		mock
			.onGet(`${SERVICEAPI_BASE_URI}/DriveItem`)
			.reply(function (config: any) {
				attachmentName = config.params["attachmentName"];

				return [200, { DriveItems: [{ Id: "0123", Uris: [567] }] }];
			});

		return trimConnector.getDriveId("abc", 0, "a.name").then((data) => {
			expect(attachmentName).toEqual("a.name");
		});
	});

	it("fetch EML", async () => {
		let token = "";
		let itemId = "";
		let attachmentName = "";
		mock
			.onGet(`${SERVICEAPI_BASE_URI}/ExchangeItem`)
			.reply(function (config: any) {
				token = config.headers["Authorization"];
				itemId = config.params["itemId"];
				attachmentName = config.params["attachmentName"];

				return [200, "FilePath"];
			});

		expect.assertions(4);
		return trimConnector.fetchEML("abc", "a.name").then((data) => {
			expect(itemId).toEqual("abc");
			expect(token).toEqual("Bearer token123");
			expect(attachmentName).toEqual("a.name");
			expect(data).toEqual("FilePath");
		});
	});

	it("gets the record text", () => {
		let token = "";
		let uri = 0;
		mock.onGet(`${SERVICEAPI_BASE_URI}/GetFile`).reply(function (config: any) {
			token = config.headers["Authorization"];
			uri = config.params["uri"];

			return [200, { File: "test" }];
		});

		expect.assertions(2);
		return trimConnector.getRecordAsText(1).then((data) => {
			expect(uri).toEqual(1);
			expect(data).toEqual("test");
			// expect(data.Uri).toEqual(567);
			// expect(token).toEqual("Bearer token123");
		});
	});

	it("gets Record Uris", async () => {
		mock
			.onGet(`${SERVICEAPI_BASE_URI}/DriveItem`)
			.reply(function (config: any) {
				return [200, { DriveItems: [{ Id: "0123", Uris: [567] }] }];
			});

		expect.assertions(1);
		const data = await trimConnector.getDriveId("test", 0);
		expect(data.Uris).toEqual([567]);
	});

	it("handles an error response without a body", async () => {
		mock.onGet(`${SERVICEAPI_BASE_URI}/DriveItem`).networkError();

		expect.assertions(1);

		try {
			await trimConnector.getDriveId("", 0);
		} catch (error) {
			expect(error.message).toEqual("Network Error");
		}
	});

	describe("Test object details fetch from TRIM", () => {
		beforeEach(() => {
			mock
				.onGet(`${SERVICEAPI_BASE_URI}/Record/678`, {
					params: {
						propertySets: "Detailed",
						propertyValue: "Both",
						stringDisplayType: "ViewPane",
						includePropertyDefs: true,
						properties: "ToolTip,NameString,RecordExternalEditingComplete",
						descendantProperties: "RecordNumber",
					},
				})
				.reply((config) => {
					return [
						200,
						{
							Results: [
								{
									TrimType: "RecordType",
									RecordTitle: { StringValue: "test" },
									Fields: {
										Visibility: {
											StringValue: "High",
										},
									},
								},
							],
							PropertiesAndFields: {
								Record: [
									{
										Id: "RecordTitle",
										Caption: "Title",
									},
									{
										Id: "Visibility",
										Caption: "Visibility Caption",
									},
								],
							},
						},
					];
				});
		});

		it("requests details in a Record details request", async () => {
			expect.assertions(5);
			const data = await trimConnector.getObjectDetails(
				BaseObjectTypes.Record,
				678
			);
			expect(data.results.length).toBe(1);
			expect(data.propertiesAndFields.length).toBe(2);
			expect(data.results[0].RecordTitle.StringValue).toEqual("test");
			expect(data.propertiesAndFields[0].Caption).toEqual("Title");
			expect(data.propertiesAndFields[0].Id).toEqual("RecordTitle");
		});

		it("handles fields in response", async () => {
			expect.assertions(3);
			const data = await trimConnector.getObjectDetails(
				BaseObjectTypes.Record,
				678
			);

			expect(data.results[0].Fields!.Visibility.StringValue).toEqual("High");
			expect(data.propertiesAndFields[1].Id).toEqual("Visibility");
			expect(data.propertiesAndFields[1].Caption).toEqual("Visibility Caption");
		});
	});

	describe("TRIM Actions", () => {
		let postBody: any;
		let deleteCalled = false;
		let postUrl = "";
		beforeEach(() => {
			mock.reset();
			postBody = null;
			mock.onPost(`${SERVICEAPI_BASE_URI}/Record`).reply((config) => {
				postBody = config.data;
				return [200, { Results: [{}] }];
			});

			mock
				.onPost(new RegExp(`${SERVICEAPI_BASE_URI}/CheckinPlace/*/*`))
				.reply((config) => {
					postBody = config.data;
					deleteCalled = true;
					postUrl = config.url;
					return [200, { Results: [{}] }];
				});
		});

		it("sends a Uri for the Check in", async () => {
			await trimConnector.runAction(CommandIds.RecCheckIn, 786, "file.doc", "");
			expect(JSON.parse(postBody)).toEqual(
				expect.objectContaining({
					Uri: 786,
					RecordFilePath: "file.doc",
				})
			);
		});

		it("Deletes a checkin place", async () => {
			expect.assertions(1);

			await trimConnector.runAction(
				CommandIds.Remove,
				90000001,
				"",
				"",
				BaseObjectTypes.CheckinPlace
			);

			expect(postUrl).toContain("90000001");
		});

		it("sends an action for add to favourites", async () => {
			expect.assertions(1);
			const expectedResponse = {
				Uri: 9000000001,
				SetUserLabel: {
					SetUserLabelFavoriteType: "Favorites",
				},
			};

			await trimConnector.runAction(
				CommandIds.AddToFavorites,
				9000000001,
				"",
				""
			);

			expect(JSON.parse(postBody)).toEqual(
				expect.objectContaining(expectedResponse)
			);
		});

		it("sets Editor Complete on RecCheckinDelete", async () => {
			expect.assertions(1);
			const expectedResponse = {
				Uri: 9000000001,
				RecordExternalEditingDoneBy: { FindBy: "me" },
			};

			await trimConnector.runAction(
				CommandIds.RecCheckInDelete,
				9000000001,
				"",
				""
			);

			expect(JSON.parse(postBody)).toEqual(
				expect.objectContaining(expectedResponse)
			);
		});

		it("sets Editor Complete on RecUndoCheckinDelete", async () => {
			expect.assertions(1);
			const expectedResponse = {
				Uri: 9000000001,
				RecordExternalEditingDoneBy: 0,
			};

			await trimConnector.runAction(
				CommandIds.RecUndoCheckInDelete,
				9000000001,
				"",
				""
			);

			expect(JSON.parse(postBody)).toEqual(
				expect.objectContaining(expectedResponse)
			);
		});

		it("sends an action for remove from favourites", async () => {
			expect.assertions(1);
			const expectedResponse = {
				Uri: 9000000001,
				RemoveUserLabel: {
					RemoveUserLabelFavoriteType: "Favorites",
				},
			};

			await trimConnector.runAction(
				CommandIds.RemoveFromFavorites,
				9000000001,
				"",
				""
			);
			expect(JSON.parse(postBody)).toEqual(
				expect.objectContaining(expectedResponse)
			);
		});
	});
	describe("TRIM child collections", () => {
		let postBody: any;
		beforeEach(() => {
			mock.reset();
			postBody = null;
			mock.onPost(`${SERVICEAPI_BASE_URI}/Record`).reply((config) => {
				postBody = config.data;
				return [200, { Results: [{}] }];
			});
		});
		it("posts the correct body for add relationship", async () => {
			await trimConnector.createRelationship(1, 2, "IsAltIn");

			expect(postBody).toEqual(
				JSON.stringify({
					Uri: 1,
					ChildRelationships: [
						{
							RecordRelationshipRelationType: "IsAltIn",
							RecordRelationshipRelatedRecord: { Uri: 2 },
						},
					],
				})
			);
		});
	});

	describe("Search Clauses", () => {
		it("returns the search clause definitions", async () => {
			mock
				.onGet(`${SERVICEAPI_BASE_URI}/SearchClauseDef`)
				.reply(function (config: any) {
					return [
						200,
						{
							SearchClauseDefs: [
								{
									InternalName: "Acl",
									Caption: "test caption",
									ToolTip: "test tooltip",
								},
							],
						},
					];
				});

			expect.assertions(4);
			const data = await trimConnector.getSearchClauseDefinitions(
				BaseObjectTypes.Record
			);

			expect(data.length).toBe(1);
			expect(data[0].Caption).toEqual("test caption");
			expect(data[0].InternalName).toEqual("Acl");
			expect(data[0].ToolTip).toEqual("test tooltip");
		});
	});

	describe("Object Definitions", () => {
		it("returns the object definitions", async () => {
			mock
				.onGet(`${SERVICEAPI_BASE_URI}/ObjectDef`, {
					params: {
						ObjectType: "Main",
					},
				})
				.reply(function (config: any) {
					return [
						200,
						{
							ObjectDefs: [
								{
									CaptionPlural: "Saved Searches",
									Caption: "Saved Search",
									Abbreviation: "srh",
									Name: "savedSearch",
									Id: "SavedSearch",
								},
							],
							ResponseStatus: {},
						},
					];
				});

			const data = await trimConnector.getObjectDefinitions();

			expect(data.length).toBe(1);
			expect(data[0].Caption).toEqual("Saved Search");
			expect(data[0].CaptionPlural).toEqual("Saved Searches");
			expect(data[0].Id).toEqual("SavedSearch");
			expect.assertions(4);
		});
	});

	describe("Object Caption", () => {
		it("returns the object definitions", async () => {
			mock
				.onGet(`${SERVICEAPI_BASE_URI}/ObjectDef`, {
					params: {
						ObjectType: "Main",
					},
				})
				.reply(function (config: any) {
					return [
						200,
						{
							ObjectDefs: [
								{
									CaptionPlural: "Saved Searches",
									Caption: "Saved Search",
									Abbreviation: "srh",
									Name: "savedSearch",
									Id: "SavedSearch",
								},
							],
							ResponseStatus: {},
						},
					];
				});

			const data = await trimConnector.getObjectCaption(
				BaseObjectTypes.SavedSearch
			);

			const locationData = await trimConnector.getObjectCaption(
				BaseObjectTypes.Location
			);

			expect(data).toEqual("Saved Search");
			expect(locationData).toEqual("Location");
			expect.assertions(2);
		});
	});

	describe("Database properties", () => {
		it("returns Currency Symbol", async () => {
			mock
				.onGet(`${SERVICEAPI_BASE_URI}/Database`, {
					params: {
						properties:
							"DatabaseCurrencySymbol,DatabaseEmailSubjectPrefix,DatabaseId",
					},
				})
				.reply(function (config: any) {
					return [
						200,
						{
							Results: [
								{
									DatabaseCurrencySymbol: { Value: "$" },
									DatabaseEmailSubjectPrefix: { Value: "CM:" },
									DatabaseId: { Value: "N1" },
									TrimType: "Database",
									Uri: 1,
								},
							],
							PropertiesAndFields: {},
							TotalResults: 0,
							MinimumCount: 0,
							Count: 0,
							HasMoreItems: false,
							TrimType: "Unknown",
							ResponseStatus: {},
						},
					];
				});
			expect.assertions(3);

			const data = await trimConnector.getDatabaseProperties();
			expect(data.CurrencySymbol).toEqual("$");
			expect(data.EmailSubjectPrefix).toEqual("CM:");
			expect(data.Id).toEqual("N1");
		});
	});

	describe("User Options", () => {
		it("returns the search user options", async () => {
			mock
				.onGet(`${SERVICEAPI_BASE_URI}/UserOptions/Search`)
				.reply(function (config: any) {
					return [
						200,
						{
							UserOptions: {
								__type:
									"HP.HPTRIM.ServiceModel.SearchUserOptions, HP.HPTRIM.ServiceAPI.Model",
								SearchUserOptionsStartPointForContainers: {
									Value: "Containers",
									StringValue: "Recent Containers",
								},
								SearchUserOptionsStartPointForDocuments: {
									Value: "RecentDocs",
									StringValue: "Recent Documents",
								},
								SearchUserOptionsStartPointForLocations: {
									Value: "Favorites",
									StringValue: "Favorite Items",
								},
								SearchUserOptionsStartPointRecordDefault: {
									Value: "FavRecords",
									StringValue: "Favorite records",
								},
								SearchUserOptionsStartPointDefault: {
									Value: "All",
									StringValue: "All Items",
								},
								SearchUserOptionsIncludeAlternateWhenShowingFolderContents: {
									Value: false,
									StringValue: "No",
								},
								SearchUserOptionsContentsInReverseDateOrder: {
									Value: true,
									StringValue: "Yes",
								},
							},
						},
					];
				});
			expect.assertions(3);

			const data = await trimConnector.getSearchOptions();
			expect(data.StartPointForContainers).toEqual("Containers");
			expect(data.StartPointForLocations).toEqual("Favorites");
			expect(data.ContentsInReverseDateOrder).toBe(true);
		});

		[
			{ json: "droppedfilesDefaultRTNitInOffice", expected: undefined },
			{
				json: "droppedfiles",
				expected: {
					NameString: "Infringement",
					TrimType: "RecordType",
					Uri: 9000000000,
				},
			},
		].forEach((data) => {
			it(`gets the default record type ${data.json}`, async () => {
				var json = require(`./testdata/${data.json}.json`);

				mock.onGet().reply(function (config: any) {
					return [200, json];
				});

				const recordType: IRecordType = await trimConnector.getDefaultRecordType();
				expect(recordType).toEqual(data.expected);
			});
		});

		[
			{
				json: "droppedfilesDefaultRTNitInOffice",
				expected: {
					defaultRecordType: {
						NameString: "Infringement2",
						TrimType: "RecordType",
						Uri: 9000000000,
					},
					useDefaultRecordType: false,
				},
			},
			{
				json: "droppedfiles",
				expected: {
					defaultRecordType: {
						NameString: "Infringement",
						TrimType: "RecordType",
						Uri: 9000000000,
					},
					useDefaultRecordType: true,
				},
			},
		].forEach((data) => {
			it(`gets outlook user options ${data.json}`, async () => {
				var json = require(`./testdata/${data.json}.json`);

				mock.onGet().reply(function (config: any) {
					return [200, json];
				});

				const options: IOutlookUserOptions = await trimConnector.getOutlookUserOptions();
				expect(options).toEqual(data.expected);
			});
		});
	});

	it("sets the outlook user options", async () => {
		let postConfig: any;
		mock.reset();
		mock
			.onPost(`${SERVICEAPI_BASE_URI}/UserOptions/DroppedFiles`)
			.reply(function (config: any) {
				postConfig = config;
				return [
					200,
					{
						UserOptions: {
							__type:
								"HP.HPTRIM.ServiceModel.DroppedFilesUserOptions, HP.HPTRIM.ServiceAPI.Model",

							DroppedFilesUserOptionsRecordType: {
								RecordTypeName: {
									Value: "Document",
								},
								TrimType: "RecordType",
								Uri: 2,
								Icon: {
									IsFileTypeIcon: false,
									IsInternalIcon: true,
									IsValid: true,
									FileType: "",
									Id: "YellowDoc",
								},
								StringValue: "2",
							},

							DroppedFilesUserOptionsUseDefaultRecordTypeInOffice: {
								Value: true,
								StringValue: "Yes",
							},
							LoadFromGlobalSetting: false,
							SaveAsGlobalSetting: false,
						},
						ResponseStatus: {},
					},
				];
			});
		await trimConnector.setOutlookUserOptions({
			defaultRecordType: {
				NameString: "Infringement",
				TrimType: BaseObjectTypes.RecordType,
				Uri: 9000000000,
			},
			useDefaultRecordType: true,
		});
		expect(postConfig.data).toEqual(
			JSON.stringify({
				DroppedFilesUserOptionsUseDefaultRecordTypeInOffice: true,
				DroppedFilesUserOptionsRecordType: {
					TrimType: "RecordType",
					Uri: 9000000000,
				},
			})
		);
	});
	it("sends request for NeedsDataEntryForm", async () => {
		let postConfig: any;
		mock
			.onPost(`${SERVICEAPI_BASE_URI}/${BaseObjectTypes.Record}`)
			.reply(function (config: any) {
				postConfig = config;

				return [
					200,
					{
						Results: [
							{
								Uri: 123,
								RecordNeedsDataEntryForm: { Value: true },
							},
						],
					},
				];
			});
		await flushPromises();
		const isNeeded = await trimConnector.isDataEntryFormNeeded(1);
		expect(isNeeded).toBeTruthy();
		expect(postConfig.data).toEqual(
			JSON.stringify({
				RecordRecordType: 1,
				properties: "RecordNeedsDataEntryForm",
				ByPassSave: true,
				RecordTitle: "test",
			})
		);
	});

	[
		{
			trimType: BaseObjectTypes.CheckinPlace,
			commandIds: "Remove,Properties",
			expected: [
				{
					CommandId: "Properties",
					MenuEntryString: "Properties",
					Tooltip: "Display Properties",
					StatusBarMessage: "Display Properties",
					NeedsAnObject: true,
				},
				{
					CommandId: "Remove",
					MenuEntryString: "Delete",
					Tooltip: "Delete Check In Place",
					StatusBarMessage: "Delete Check In Place",
					NeedsAnObject: true,
				},
			],
		},
		{
			trimType: BaseObjectTypes.Record,
			expected: [
				{
					CommandId: "Properties",
					MenuEntryString: "Properties",
					Tooltip: "Display Properties",
					StatusBarMessage: "Display Properties",
					NeedsAnObject: true,
				},
				{
					CommandId: "RecCheckIn",
					MenuEntryString: "Check In",
					Tooltip: "Check In an Electronic Document",
					StatusBarMessage: "Check In an Electronic Document",
					NeedsAnObject: true,
				},
				{
					CommandId: "AddToFavorites",
					MenuEntryString: "Favorites",
					Tooltip: "Add To Favorites",
					StatusBarMessage: "Add To Favorites",
					NeedsAnObject: true,
				},
				{
					CommandId: "RemoveFromFavorites",
					MenuEntryString: "Remove from Favorites",
					Tooltip: "Remove from Favorites",
					StatusBarMessage: "Remove from Favorites",
					NeedsAnObject: true,
				},
			],
			commandIds: "Properties,RecCheckIn,AddToFavorites,RemoveFromFavorites",
		},
	].forEach((testData) => {
		it(`gets the commands for the ${testData.trimType} list`, async () => {
			let postConfig: any;
			mock.reset();
			mock
				.onGet(`${SERVICEAPI_BASE_URI}/CommandDef`)
				.reply(function (config: any) {
					postConfig = config;
					if (config.params.TrimType == BaseObjectTypes.Record) {
						return [
							200,
							{
								CommandDefs: [
									{
										RefreshStyle: "CurrentAndParent",
										IsListCommand: false,
										IsNavigationCommand: false,
										NeedsAnObject: true,
										CommandId: "Properties",
										MenuEntryString: "Properties",
										Tooltip: "Display Properties",
										StatusBarMessage: "Display Properties",
										Icon: "Properties",
										MenuItemType: "MenuItemCommand",
									},
									{
										RefreshStyle: "Current",
										IsListCommand: false,
										IsNavigationCommand: false,
										NeedsAnObject: true,
										CommandId: "RecCheckIn",
										MenuEntryString: "Check In",
										Tooltip: "Check In an Electronic Document",
										StatusBarMessage: "Check In an Electronic Document",
										Icon: "RecCheckin",
										MenuItemType: "MenuItemCommand",
									},
									{
										RefreshStyle: "None",
										IsListCommand: false,
										IsNavigationCommand: false,
										NeedsAnObject: true,
										CommandId: "AddToFavorites",
										MenuEntryString: "Favorites",
										Tooltip: "Add To Favorites",
										StatusBarMessage: "Add To Favorites",
										Icon: "AddToFavorites",
										MenuItemType: "MenuItemCommand",
									},
									{
										RefreshStyle: "None",
										IsListCommand: false,
										IsNavigationCommand: false,
										NeedsAnObject: true,
										CommandId: "RemoveFromFavorites",
										MenuEntryString: "Remove from Favorites",
										Tooltip: "Remove from Favorites",
										StatusBarMessage: "Remove from Favorites",
										Icon: "AddToFavorites",
										MenuItemType: "MenuItemCommand",
									},
								],
							},
						];
					} else {
						return [
							200,
							{
								CommandDefs: [
									{
										RefreshStyle: "CurrentAndParent",
										IsListCommand: false,
										IsNavigationCommand: false,
										NeedsAnObject: true,
										CommandId: "Properties",
										MenuEntryString: "Properties",
										Tooltip: "Display Properties",
										StatusBarMessage: "Display Properties",
										Icon: "Properties",
										MenuItemType: "MenuItemCommand",
									},
									{
										RefreshStyle: "Delete",
										IsListCommand: false,
										IsNavigationCommand: false,
										NeedsAnObject: true,
										CommandId: "Remove",
										MenuEntryString: "Delete",
										Tooltip: "Delete Check In Place",
										StatusBarMessage: "Delete Check In Place",
										Icon: "Cross",
										MenuItemType: "MenuItemCommand",
									},
								],
							},
						];
					}
				});

			await flushPromises();
			const commandDefs = await trimConnector.getMenuItemsForList(
				testData.trimType
			);
			expect(commandDefs.length).toEqual(testData.expected.length);
			expect(commandDefs).toEqual(expect.arrayContaining(testData.expected));

			expect(postConfig.params).toEqual(
				expect.objectContaining({
					TrimType: testData.trimType,
					CommandIds: testData.commandIds,
				})
			);
		});

		it(`gets the enabled command ids`, async () => {
			let postConfig: any;
			mock.reset();
			mock
				.onGet(`${SERVICEAPI_BASE_URI}/CheckinPlace/7`)
				.reply(function (config: any) {
					postConfig = config;

					return [
						200,
						{
							Results: [
								{
									EnabledCommandIds: ["Properties"],
								},
							],
						},
					];
				});

			await flushPromises();
			const enabledIds = await trimConnector.getEnabledCommandIds(
				BaseObjectTypes.CheckinPlace,
				7
			);
			expect(enabledIds).toEqual(["Properties"]);
			expect(postConfig.params.properties).toContain("EnabledCommandIds");
			expect(postConfig.params.cid_SelectedIds).toEqual("Remove,Properties");
		});
	});

	describe("Caching options", () => {
		let count = 0;

		beforeEach(() => {
			count = 0;
			(global as any).localStorage.clear();

			mock.reset();
			mock
				.onGet(`${SERVICEAPI_BASE_URI}/Database`)
				.reply(function (config: any) {
					count++;
					return [
						200,
						{
							Results: [
								{
									DatabaseCurrencySymbol: { Value: "$" },
									DatabaseEmailSubjectPrefix: { Value: "CM:" },
									DatabaseId: { Value: "N1" },
									TrimType: "Database",
									Uri: 1,
								},
							],
							PropertiesAndFields: {},
							TotalResults: 0,
							MinimumCount: 0,
							Count: 0,
							HasMoreItems: false,
							TrimType: "Unknown",
							ResponseStatus: {},
						},
					];
				});
		});

		it("gets default value", () => {
			const data = trimConnector.getUseCheckinStyles();
			expect(data).toEqual(false);
		});

		it("sets new value", () => {
			trimConnector.setUseCheckinStyles(true);
			const data = trimConnector.getUseCheckinStyles();
			expect(data).toEqual(true);
		});

		it("cache value persisted when cache re-set", () => {
			trimConnector.setUseCheckinStyles(true);
			trimConnector.clearCache();
			const data = trimConnector.getUseCheckinStyles();
			expect(data).toEqual(true);
		});

		it("gets database options from cache", async () => {
			const a = await trimConnector.getDatabaseProperties();
			const b = await trimConnector.getDatabaseProperties();

			expect(count).toEqual(1);
		});

		it("clears database options from cache", async () => {
			await trimConnector.getDatabaseProperties();
			trimConnector.clearCache();
			await trimConnector.getDatabaseProperties();

			expect(count).toEqual(2);
		});

		it("suppress data entry form defaults to true", () => {
			const suppress = trimConnector.suppressDataEntryForm();

			expect(suppress).toEqual(true);
		});

		it("set changes suppress data entry form to false", () => {
			const suppress = trimConnector.suppressDataEntryForm(false);

			expect(suppress).toEqual(false);
		});

		it("caches change to false", () => {
			trimConnector.suppressDataEntryForm(false);
			const suppress = trimConnector.suppressDataEntryForm();

			expect(suppress).toEqual(false);
		});
	});
});
