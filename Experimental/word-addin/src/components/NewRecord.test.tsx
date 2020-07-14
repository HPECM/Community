(global as any).config = { BASE_URL: "" };

import * as React from "react";
import { mount, shallow } from "enzyme";
import { NewRecord } from "./NewRecord";
import { PrimaryButton } from "office-ui-fabric-react/lib/Button";
import {
	TrimConnector,
	ISearchResults,
	ISearchParameters,
} from "../trim-coms/trim-connector";
import { ITrimMainObject } from "../trim-coms/trim-connector";
import PropertySheet from "./PropertySheet";
import { IOfficeConnector } from "../office-coms/office-connector";
import BaseObjectTypes from "../trim-coms/trim-baseobjecttypes";
import AppStoreWord from "../stores/AppStoreWord";

import RecordTypePicker from "../components/RecordTypePicker/RecordTypePicker";
import { IGetRecordUriResponse } from "../office-coms/word-connector";
import flushPromises = require("flush-promises");
import { Provider } from "mobx-react";

describe("New Record layout", function () {
	let testRecordUrn = "";
	let testSubjectPrefix = "";
	let propertySheetTrimType;
	let wrapper;
	let registerProps = [];

	let registerType1 = undefined;
	let registerType2 = undefined;
	let errorMessage: string = undefined;
	let populatePages = false;
	let rejectRegister = false;
	let noFormNeeded = false;
	let recordPropsTest;
	let recordUriTest = 0;
	let isEmail = false;

	const pageItemsWithTitle = {
		NeedsDataEntryForm: true,
		DataEntryFormDefinition: {
			Pages: [
				{
					Caption: "General",
					Type: "Normal",
					PageItems: [
						{
							Format: "String",
							Name: "RecordTypedTitle",
							Caption: "Title (Free Text Part)",
						},
					],
				},
			],
		},
	};

	const noFormForm = {
		NeedsDataEntryForm: false,
		DataEntryFormDefinition: {
			Pages: [
				{
					Caption: "General",
					Type: "Normal",
					PageItems: [
						{
							Format: "String",
							Name: "RecordTypedTitle",
							Caption: "Title (Free Text Part)",
						},
					],
				},
			],
		},
	};

	const makeWrapper = (
		trimType: BaseObjectTypes,
		onCreated?: any,
		folderId?: string,
		folderName?: string,
		isLinkedFolder?: boolean
	) => {
		const innerWrapper = shallow<NewRecord>(
			<NewRecord
				appStore={mockStore}
				trimConnector={mockTrimConnector}
				wordConnector={new MockWordConnector()}
				trimType={trimType}
				onAfterSave={onCreated}
				folderId={folderId}
				computedCheckinStyleName={folderName}
				isLinkedFolder={isLinkedFolder}
				processInBackgroundIfPossible={false}
			/>
		);
		innerWrapper.setState({ formDefinition: { Pages: [] } });

		return innerWrapper;
	};

	beforeEach(() => {
		wrapper = makeWrapper(BaseObjectTypes.Record);
		isEmail = false;
	});

	afterEach(() => {
		testRecordUrn = "";
		testSubjectPrefix = "";
		propertySheetTrimType = undefined;
		registerProps = [];
		registerType1 = undefined;
		registerType2 = undefined;
		errorMessage = undefined;
		populatePages = false;
		rejectRegister = false;
		mockStore.setDocumentInfo({ ...mockStore.documentInfo, EmailPath: null });
		noFormNeeded = false;
		//mockStore.RecordUri = 0;
		recordUriTest = 0;
		recordPropsTest = undefined;
	});

	let mockTrimConnector = new TrimConnector();

	mockTrimConnector.saveToTrim = (
		trimType: BaseObjectTypes,
		properties: any,
		fields: any
	) => {
		registerProps.push(properties);

		if (registerType1) {
			registerType2 = trimType;
		} else {
			registerType1 = trimType;
		}

		return new Promise<ITrimMainObject>(function (resolve, reject) {
			if (rejectRegister) {
				reject("create error");
			} else {
				resolve({ Uri: 456 });
			}
		});
	};

	const doSearch = function <T extends ITrimMainObject>(
		options: ISearchParameters
	): Promise<ISearchResults<T>> {
		return new Promise(function (resolve) {
			resolve({
				results: [
					{ Uri: 1, NameString: "Document" } as T,
					{ Uri: 5, NameString: "Document 5" } as T,
				],
				hasMoreItems: false,
			});
		});
	};

	mockTrimConnector.search = doSearch.bind(mockTrimConnector);

	mockTrimConnector.getPropertySheet = (trimType: BaseObjectTypes) => {
		propertySheetTrimType = trimType;
		return new Promise(function (resolve) {
			resolve(
				noFormNeeded
					? noFormForm
					: populatePages
					? pageItemsWithTitle
					: { DataEntryFormDefinition: { Pages: [{ PageItems: [] }] } }
			);
		});
	};

	mockTrimConnector.getDatabaseProperties = () => {
		return new Promise(function (resolve) {
			resolve({
				EmailSubjectPrefix: "CM:",
				CurrencySymbol: "",
			});
		});
	};

	// const mockStore = {
	// 	RecordUri: 0,
	// 	RecordProps: {},
	// 	messages: {
	// 		web_Register: "Register",
	// 		web_SelectRecordType: "Select a Record Type",
	// 		web_RecordTypeRequiresForm: "NeedsDataEntryForm",
	// 	},
	// 	documentInfo: { Options: {}, URN: "test_urn", EmailPath: null },
	// 	createRecord: (recordUri, recordProps) => {
	// 		mockStore.RecordUri = recordUri;
	// 		mockStore.RecordProps = recordProps;

	// 		return new Promise(function(resolve) {
	// 			resolve();
	// 		});
	// 	},
	// 	FileName: "default title",
	// 	setError: (message: string) => {
	// 		errorMessage = message;
	// 	},
	// };

	let mockStore = new AppStoreWord(null, null);
	mockStore.isEmail = function () {
		return isEmail;
	}.bind(mockStore);
	mockStore.setDocumentInfo({ Uris: [], URN: "test_urn" });
	mockStore.messages = {
		web_Register: "Register",
		web_SelectRecordType: "Select a Record Type",
		web_RecordTypeRequiresForm: "NeedsDataEntryForm",
	};
	mockStore.createRecord = function (recordUri, recordProps) {
		recordUriTest = recordUri;
		recordPropsTest = recordProps;

		return new Promise(function (resolve) {
			resolve({ Uri: 5678 });
		});
	}.bind(mockStore);

	mockStore.setFileName("default title");

	mockStore.setError = function (message: string) {
		errorMessage = message;
	}.bind(mockStore);

	class MockWordConnector implements IOfficeConnector {
		insertLink(textToInsert: string, url: string): void {
			throw new Error("Method not implemented.");
		}
		saveDocument(): Promise<void> {
			throw new Error("Method not implemented.");
		}
		getDocumentData(writeSlice: any): Promise<string> {
			throw new Error("Method not implemented.");
		}
		setAutoOpen(
			autoOpen: boolean,
			recordUrn: string,
			subjectPrefix: string
		): void {
			testRecordUrn = recordUrn;
			testSubjectPrefix = subjectPrefix;
		}
		getAutoOpen(): boolean {
			throw new Error("Method not implemented.");
		}
		insertText(textToInsert: string): void {
			throw new Error("Method not implemented.");
		}
		getAccessToken(): Promise<string> {
			throw new Error("Method not implemented.");
		}
		setUri(uri: number): Promise<IGetRecordUriResponse> {
			throw new Error("Method not implemented.");
		}
		getWebUrl(): Promise<string> {
			throw new Error("Method not implemented.");
		}
		getUri(): Promise<IGetRecordUriResponse> {
			throw new Error("Method not implemented.");
		}
	}

	it("contains a Record Type dropdown", () => {
		expect(wrapper.find(RecordTypePicker).exists()).toBeTruthy();
	});

	it("contains a button", () => {
		expect(wrapper.find(PrimaryButton).exists()).toBeTruthy();
		expect(wrapper.find(PrimaryButton).childAt(0).text()).toMatch("Register");
	});

	it("Sets the Record Type Uri from on load and onChange", () => {
		//	expect(wrapper.instance.recordTypeUri).toEqual(0);
		wrapper.setProps({
			validateRecordType: null,
		});
		wrapper
			.find(RecordTypePicker)
			.first()
			.props()
			.onRecordTypeSelected({ Uri: 1, TrimType: BaseObjectTypes.RecordType });

		expect(wrapper.instance().recordTypeUri).toEqual(1);

		wrapper
			.find(RecordTypePicker)
			.first()
			.props()
			.onRecordTypeSelected({ Uri: 5, TrimType: BaseObjectTypes.RecordType });

		expect(wrapper.instance().recordTypeUri).toEqual(5);
	});

	it("calls create record on button press", () => {
		wrapper
			.find(RecordTypePicker)
			.first()
			.props()
			.onRecordTypeSelected({ Uri: 1, TrimType: BaseObjectTypes.RecordType });

		wrapper
			.update()
			.find("form")
			.first()
			.simulate("submit", { preventDefault: function () {} });

		expect(recordUriTest).toEqual(1);
	});

	it("calls register in TRIM for non Record object", async () => {
		const wrapper = makeWrapper(BaseObjectTypes.CheckinStyle);

		wrapper
			.find(RecordTypePicker)
			.first()
			.props()
			.onRecordTypeSelected({ Uri: 5, TrimType: BaseObjectTypes.RecordType });

		wrapper
			.find("form")
			.first()
			.simulate("submit", { preventDefault: function () {} });
		await flushPromises();
		expect(registerType1).toEqual(BaseObjectTypes.CheckinStyle);
		expect(registerType2).toEqual(BaseObjectTypes.CheckinPlace);
		expect(registerProps[0]).toEqual({ CheckinStyleRecordType: 5 });
	});

	it("calls create record automatically when data entry form not required", async () => {
		noFormNeeded = true;
		const wrapper = shallow<NewRecord>(
			<NewRecord
				appStore={mockStore}
				trimConnector={mockTrimConnector}
				wordConnector={new MockWordConnector()}
				trimType={BaseObjectTypes.Record}
				processInBackgroundIfPossible={true}
				selectedRecordType={{ Uri: 4, TrimType: BaseObjectTypes.RecordType }}
			/>
		);

		await flushPromises();
		expect(recordUriTest).toEqual(4);
		expect(recordPropsTest["DataEntryFormDefinition"]).toBeTruthy();
	});

	/*
	[
		{ isEmail: true, expected: undefined },
		{ isEmail: false, expected: BaseObjectTypes.Record },
	].forEach((element) => {
		it(`shows form yes or no when default Record Type set for is email == ${element.isEmail}`, async () => {
			isEmail = element.isEmail();
			mount<NewRecord>(
				<Provider
					appStore={mockStore}
					trimConnector={mockTrimConnector}
					wordConnector={new MockWordConnector()}
				>
					<NewRecord
						appStore={mockStore}
						trimConnector={mockTrimConnector}
						wordConnector={new MockWordConnector()}
						trimType={BaseObjectTypes.Record}
						defaultRecordType={{ Uri: 4, TrimType: BaseObjectTypes.RecordType }}
					/>
				</Provider>
			);

			await flushPromises();
			expect(propertySheetTrimType).toBe(element.expected);
		});
	});*/

	it(`shows form when Record Type changed after default set`, async () => {
		isEmail = true;
		const wrapper = mount<NewRecord>(
			<Provider
				appStore={mockStore}
				trimConnector={mockTrimConnector}
				wordConnector={new MockWordConnector()}
			>
				<NewRecord
					appStore={mockStore}
					trimConnector={mockTrimConnector}
					wordConnector={new MockWordConnector()}
					trimType={BaseObjectTypes.Record}
					defaultRecordType={{ Uri: 4, TrimType: BaseObjectTypes.RecordType }}
				/>
			</Provider>
		);

		await flushPromises();

		wrapper
			.find(RecordTypePicker)
			.props()
			.onRecordTypeSelected({ Uri: 55, TrimType: BaseObjectTypes.RecordType });
		expect(propertySheetTrimType).toBe(BaseObjectTypes.Record);
	});
	it("sets default record type on picker", () => {
		const wrapper = makeWrapper(BaseObjectTypes.CheckinStyle);
		wrapper.setProps({
			defaultRecordType: { Uri: 66, TrimType: BaseObjectTypes.RecordType },
		});

		expect(
			wrapper.find(RecordTypePicker).first().props().defaultRecordType
		).toEqual({ Uri: 66, TrimType: BaseObjectTypes.RecordType });
	});

	it("sets error on register non Record object", async () => {
		rejectRegister = true;
		const wrapper = makeWrapper(BaseObjectTypes.CheckinStyle);

		wrapper
			.find(RecordTypePicker)
			.first()
			.props()
			.onRecordTypeSelected({ Uri: 5, TrimType: BaseObjectTypes.RecordType });

		wrapper
			.update()
			.find("form")
			.first()
			.simulate("submit", { preventDefault: function () {} });
		await flushPromises();
		expect(errorMessage).toEqual("create error");
	});

	it("create a linked folder checkin place for a Check in Style", async () => {
		const wrapper = makeWrapper(
			BaseObjectTypes.CheckinStyle,
			() => {},
			"123",
			null,
			true
		);

		wrapper
			.find(RecordTypePicker)
			.first()
			.props()
			.onRecordTypeSelected({ Uri: 5, TrimType: BaseObjectTypes.RecordType });

		wrapper
			.update()
			.find("form")
			.first()
			.simulate("submit", { preventDefault: function () {} });

		await flushPromises();
		expect(registerProps[1]).toEqual({
			CheckinPlacePlaceId: "123",
			CheckinPlaceCheckinAs: 456,
			CheckinPlacePlaceType: "MailForServerProcessing",
		});
	});

	it("create checkin place for a Check in Style", async () => {
		const wrapper = makeWrapper(
			BaseObjectTypes.CheckinStyle,
			() => {},
			null,
			null,
			false
		);

		wrapper
			.find(RecordTypePicker)
			.first()
			.props()
			.onRecordTypeSelected({ Uri: 5, TrimType: BaseObjectTypes.RecordType });

		wrapper
			.update()
			.find("form")
			.first()
			.simulate("submit", { preventDefault: function () {} });

		await flushPromises();
		expect(registerProps[1]).toEqual({
			CheckinPlaceCheckinAs: 456,
			CheckinPlacePlaceType: "MailForClientProcessing",
		});
	});

	it("calls on created event", async () => {
		let eventCalled = false;
		let createdObject;

		const wrapper = makeWrapper(BaseObjectTypes.CheckinStyle, (trimObject) => {
			eventCalled = true;
			createdObject = trimObject;
		});

		wrapper
			.find(RecordTypePicker)
			.first()
			.props()
			.onRecordTypeSelected({ Uri: 5, TrimType: BaseObjectTypes.RecordType });

		wrapper
			.update()
			.find("form")
			.first()
			.simulate("submit", { preventDefault: function () {} });

		await flushPromises();
		expect(eventCalled).toBeTruthy();
		expect(createdObject).toEqual({ Uri: 456 });
	});

	[
		{ folderId: "123", createPlace: false },
		{ folderId: undefined, createPlace: false },
	].forEach((testData) => {
		it("sends computed fields to Checkin Style", () => {
			const wrapper = makeWrapper(
				BaseObjectTypes.CheckinStyle,
				null,
				testData.folderId
			);

			wrapper
				.find(RecordTypePicker)
				.first()
				.props()
				.onRecordTypeSelected({ Uri: 5, TrimType: BaseObjectTypes.RecordType });

			const propertySheet = wrapper.find(PropertySheet);
			expect(propertySheet.props().computedProperties).toEqual([
				{
					Name: "CheckinStyleUseForServerMailCapture",
					Value: testData.createPlace,
					Type: "Property",
				},
				{
					Name: "CheckinStyleUseForServerMailFolderType",
					Value: "NormalFolder",
					Type: "Property",
				},
				{ Name: "CheckinStyleRecordType", Value: undefined, Type: "Property" },
			]);
		});
	});

	it("sends updated properties button press", () => {
		wrapper
			.update()
			.find(PropertySheet)
			.props()
			.onChange({ RecordTypedTitle: "test title" });

		wrapper
			.update()
			.find("form")
			.first()
			.simulate("submit", { preventDefault: function () {} });

		expect(recordPropsTest).toEqual({ RecordTypedTitle: "test title" });
	});

	it("sends record URN to auto open", async () => {
		wrapper
			.update()
			.find("form")
			.first()
			.simulate("submit", { preventDefault: function () {} });

		await flushPromises();
		expect(testRecordUrn).toEqual("test_urn");
	});

	it("sends the email prefix", async () => {
		wrapper
			.update()
			.find("form")
			.first()
			.simulate("submit", { preventDefault: function () {} });

		await flushPromises();
		expect(testSubjectPrefix).toEqual("CM:");
	});

	it("does not call auto open for an attachment", async () => {
		wrapper.setProps({ bypassUpdateEmailSubject: true });

		wrapper
			.update()
			.find("form")
			.first()
			.simulate("submit", { preventDefault: function () {} });

		await flushPromises();
		expect(testRecordUrn).toBeFalsy();
	});

	it("displays a property sheet when Record Type is set", async () => {
		const shallowWrapper = shallow<NewRecord>(
			<NewRecord
				appStore={mockStore}
				trimConnector={mockTrimConnector}
				wordConnector={new MockWordConnector()}
				trimType={BaseObjectTypes.Record}
			/>
		);

		// no property sheet before recordtype uri sey
		expect(shallowWrapper.find(PropertySheet).exists()).toBeTruthy();

		shallowWrapper
			.find(RecordTypePicker)
			.first()
			.props()
			.onRecordTypeSelected({ Uri: 5, TrimType: BaseObjectTypes.RecordType });

		await flushPromises();
		// 	//expect(wrapper.find(PropertySheet).exists()).toBeTruthy();
		expect(shallowWrapper.state().formDefinition).toEqual({
			Pages: [{ PageItems: [] }],
		});
		expect(shallowWrapper.find(PropertySheet).props().formDefinition).toEqual({
			Pages: [{ PageItems: [] }],
		});
	});
	it("sends the correct trimType to getPropertysheet", async () => {
		const shallowWrapper = shallow<NewRecord>(
			<NewRecord
				appStore={mockStore}
				trimConnector={mockTrimConnector}
				wordConnector={new MockWordConnector()}
				trimType={BaseObjectTypes.CheckinStyle}
			/>
		);

		shallowWrapper
			.find(RecordTypePicker)
			.first()
			.props()
			.onRecordTypeSelected({ Uri: 5, TrimType: BaseObjectTypes.RecordType });

		await flushPromises();
		expect(propertySheetTrimType).toEqual(BaseObjectTypes.CheckinStyle);
	});

	it("displays a property sheet with default record title", async () => {
		populatePages = true;

		const shallowWrapper = shallow<NewRecord>(
			<NewRecord
				appStore={mockStore}
				trimConnector={mockTrimConnector}
				wordConnector={new MockWordConnector()}
				trimType={BaseObjectTypes.Record}
			/>
		);

		shallowWrapper
			.find(RecordTypePicker)
			.first()
			.props()
			.onRecordTypeSelected({ Uri: 5, TrimType: BaseObjectTypes.RecordType });
		await flushPromises();
		expect(shallowWrapper.find(PropertySheet).props().formDefinition).toEqual({
			Pages: [
				{
					Caption: "General",
					Type: "Normal",
					PageItems: [
						{
							Format: "String",
							Name: "RecordTypedTitle",
							Caption: "Title (Free Text Part)",
							Value: "default title",
						},
					],
				},
			],
		});
	});

	[
		{ valid: true, message: undefined },
		{ valid: false, message: "NeedsDataEntryForm" },
	].forEach((testData) => {
		it(`Sets an error if the Record Type requires a data entry form - ${testData.valid} `, async () => {
			const wrapper = makeWrapper(BaseObjectTypes.CheckinStyle);

			wrapper.setProps({
				validateRecordType: () => {
					return new Promise<Boolean>(function (resolve) {
						resolve(testData.valid);
					});
				},
			});

			wrapper
				.find(RecordTypePicker)
				.first()
				.props()
				.onRecordTypeSelected({ Uri: 5, TrimType: BaseObjectTypes.RecordType });

			await flushPromises();
			expect(errorMessage).toEqual(testData.message);
		});
	});

	it(`sends computed props for Check in Style`, () => {
		const wrapper = makeWrapper(
			BaseObjectTypes.CheckinStyle,
			null,
			"cm_auto",
			"auto connect"
		);

		const propSheet = wrapper.find(PropertySheet);

		expect(propSheet.props().computedProperties).toEqual(
			expect.arrayContaining([
				{
					Name: "CheckinStyleUseForServerMailCapture",
					Value: false,
					Type: "Property",
				},
				{
					Name: "CheckinStyleUseForServerMailFolderType",
					Value: "NormalFolder",
					Type: "Property",
				},
				{ Name: "CheckinStyleRecordType", Value: undefined, Type: "Property" },
			])
		);

		expect(propSheet.props().computedProperties).not.toEqual(
			expect.arrayContaining([
				{
					Name: "CheckinStyleName",
					Value: "auto connect",
					Type: "Property",
				},
			])
		);
	});

	[
		{ isLinkedFolder: true, useForServerMailCapture: false },
		{ isLinkedFolder: false, useForServerMailCapture: false },
	].forEach((data) => {
		it(`sends computed props with name for Check in Style, is linked folder ${data.isLinkedFolder}`, () => {
			const wrapper = makeWrapper(
				BaseObjectTypes.CheckinStyle,
				null,
				"abc",
				"abc label",
				data.isLinkedFolder
			);

			const propSheet = wrapper.find(PropertySheet);

			expect(propSheet.props().computedProperties).toEqual(
				expect.arrayContaining([
					{
						Name: "CheckinStyleUseForServerMailCapture",
						Value: data.useForServerMailCapture,
						Type: "Property",
					},
					{
						Name: "CheckinStyleUseForServerMailFolderType",
						Value: "NormalFolder",
						Type: "Property",
					},
					{
						Name: "CheckinStyleRecordType",
						Value: undefined,
						Type: "Property",
					},
					{
						Name: "CheckinStyleName",
						Value: "abc label",
						Type: "Property",
					},
				])
			);
		});
	});
});
