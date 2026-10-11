import type { Metadata } from "next";
import Link from "next/link";
import {
  AdminInput,
  AdminSelect,
  EmptyPanel,
  FilterBar,
  FilterField,
  FilterSubmit,
  NoAccess,
  PageIntro,
  Panel,
  Pill,
} from "@/components/admin/ui";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { can } from "@/lib/admin";
import { currentAdmin, filters, one } from "@/lib/admin-server";
import { apiFetch } from "@/lib/api";
import { paginationLinks } from "@/lib/pagination";
import type { Collection, Paginated, Service, ServiceCategory } from "@/lib/types";
import { DeleteServiceForm, ServiceForm } from "./service-form";

export const metadata: Metadata = { title: "Services" };

/**
 * Every service in the catalogue.
 *
 * The category list is fetched alongside so the filter rail and the editor's
 * picker are populated from the same source the API would accept — including
 * the categories that are switched off, because a service can belong to one and
 * the console has to be able to show and change that.
 */
export default async function AdminServicesPage(props: PageProps<"/admin/services">) {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "view_services")) {
    return <NoAccess permission="view_services" />;
  }

  const params = await props.searchParams;
  const search = filters(params, ["q", "category_id", "per_page"]);
  const page = one(params.page);
  if (page) search.page = page;

  const [services, categories] = await Promise.all([
    apiFetch<Paginated<Service>>("/admin/services", { token: session.token, search }),
    apiFetch<Collection<ServiceCategory>>("/admin/categories", { token: session.token }),
  ]);

  const mayManage = can(account.permissions, "manage_service_catalogue");
  const filtered = Object.keys(search).some((key) => key !== "page" && key !== "per_page");

  return (
    <div className="flex flex-col gap-5">
      <PageIntro
        description={
          <>
            {services.meta.total.toLocaleString()} service
            {services.meta.total === 1 ? "" : "s"} in the catalogue. A service belongs to one
            category; deactivating one leaves it visible to professionals already offering it but
            takes it off the public grid.
          </>
        }
      >
        {can(account.permissions, "view_categories") ? (
          <Link href="/admin/categories" className="text-xs font-medium text-admin-accent hover:underline">
            Manage the categories above them
          </Link>
        ) : null}
      </PageIntro>

      {mayManage ? (
        <Panel title="Add a service">
          <details>
            <summary className="cursor-pointer text-sm font-medium text-admin-accent hover:underline">
              New service
            </summary>
            <div className="mt-4 max-w-3xl">
              <ServiceForm
                categories={categories.data}
                defaultCategoryId={one(params.category_id)}
              />
            </div>
          </details>
        </Panel>
      ) : null}

      <FilterBar action="/admin/services">
        <FilterField label="Search" className="min-w-[14rem] flex-1">
          <AdminInput
            type="search"
            name="q"
            defaultValue={one(params.q) ?? ""}
            placeholder="Name or slug"
          />
        </FilterField>

        <FilterField label="Category">
          <AdminSelect name="category_id" defaultValue={one(params.category_id) ?? ""}>
            <option value="">Any category</option>
            {categories.data.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
              </option>
            ))}
          </AdminSelect>
        </FilterField>

        <FilterSubmit>Apply</FilterSubmit>

        {filtered ? (
          <Link
            href="/admin/services"
            className="pb-2 text-xs font-medium text-admin-muted hover:text-admin-text"
          >
            Clear
          </Link>
        ) : null}
      </FilterBar>

      <Panel title="Services" bodyClassName="">
        {services.data.length === 0 ? (
          <div className="px-5 py-5">
            <EmptyPanel label={filtered ? "No service matches those filters." : "The catalogue is empty."} />
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Service</TH>
                <TH className="hidden md:table-cell">Category</TH>
                <TH className="hidden lg:table-cell">Offered by</TH>
                <TH>Status</TH>
                {mayManage ? <TH>Edit</TH> : null}
              </TR>
            </THead>
            <TBody>
              {services.data.map((service) => (
                <TR key={service.id}>
                  <TD>
                    <span className="font-medium">{service.name}</span>
                    <p className="font-mono text-xs text-admin-muted">{service.slug}</p>
                  </TD>
                  <TD className="hidden text-xs md:table-cell">
                    {service.category?.name ?? <span className="text-admin-muted">—</span>}
                  </TD>
                  <TD className="hidden text-xs tabular-nums lg:table-cell">
                    {service.professional_services_count ?? 0}
                  </TD>
                  <TD>
                    <Pill tone={service.is_active ? "success" : "neutral"}>
                      {service.is_active ? "Active" : "Hidden"}
                    </Pill>
                  </TD>
                  {mayManage ? (
                    <TD>
                      <details>
                        <summary className="cursor-pointer text-xs font-medium text-admin-accent hover:underline">
                          Edit
                        </summary>
                        <div className="mt-4 w-[min(36rem,80vw)] rounded-lg border border-admin-border bg-admin-surface/40 px-4 py-4">
                          <ServiceForm service={service} categories={categories.data} />
                          <div className="mt-5 border-t border-admin-border pt-4">
                            <DeleteServiceForm id={service.id} name={service.name} />
                          </div>
                        </div>
                      </details>
                    </TD>
                  ) : null}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>

      <Pagination links={paginationLinks(services, "/admin/services")} />
    </div>
  );
}
