import type { Metadata } from "next";
import Link from "next/link";
import { EmptyPanel, NoAccess, PageIntro, Panel, Pill } from "@/components/admin/ui";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { can } from "@/lib/admin";
import { currentAdmin } from "@/lib/admin-server";
import { apiFetch } from "@/lib/api";
import type { Collection, ServiceCategory } from "@/lib/types";
import { CategoryForm, DeleteCategoryForm } from "./category-form";

export const metadata: Metadata = { title: "Categories" };

/**
 * The category layer of the public catalogue.
 *
 * Unlike the public endpoint, this one includes the inactive rows — the console
 * has to be able to see what it has switched off, or the switch is one-way.
 *
 * Editing is inline rather than on a detail page. A category has five fields and
 * there are a dozen of them; a route per row would be more navigation than
 * screen, and the public catalogue's shape is easier to judge with every row in
 * front of you.
 */
export default async function AdminCategoriesPage(props: PageProps<"/admin/categories">) {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "view_categories")) {
    return <NoAccess permission="view_categories" />;
  }

  const { data: categories } = await apiFetch<Collection<ServiceCategory>>("/admin/categories", {
    token: session.token,
  });

  const mayManage = can(account.permissions, "manage_service_catalogue");
  const inactive = categories.filter((category) => !category.is_active).length;

  return (
    <div className="flex flex-col gap-5">
      <PageIntro
        description={
          <>
            {categories.length} categor{categories.length === 1 ? "y" : "ies"}
            {inactive > 0 ? `, ${inactive} switched off` : ""}. A category with services cannot be
            deleted — deactivate it instead, and its services stay in the catalogue.
          </>
        }
      >
        {can(account.permissions, "view_services") ? (
          <Link href="/admin/services" className="text-xs font-medium text-admin-accent hover:underline">
            Manage the services inside them
          </Link>
        ) : null}
      </PageIntro>

      {mayManage ? (
        <Panel title="Add a category">
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-admin-accent hover:underline">
              New category
            </summary>
            <div className="mt-4 max-w-3xl">
              <CategoryForm />
            </div>
          </details>
        </Panel>
      ) : null}

      <Panel title="Categories" bodyClassName="">
        {categories.length === 0 ? (
          <div className="px-5 py-5">
            <EmptyPanel label="The catalogue has no categories yet." />
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Category</TH>
                <TH className="hidden md:table-cell">Slug</TH>
                <TH>Services</TH>
                <TH className="hidden lg:table-cell">Order</TH>
                <TH>Status</TH>
                {mayManage ? <TH>Edit</TH> : null}
              </TR>
            </THead>
            <TBody>
              {categories.map((category) => (
                <TR key={category.id}>
                  <TD>
                    <span className="font-medium">{category.name}</span>
                    {category.description ? (
                      <p className="max-w-md text-xs text-admin-muted">{category.description}</p>
                    ) : null}
                  </TD>
                  <TD className="hidden font-mono text-xs text-admin-muted md:table-cell">
                    {category.slug}
                  </TD>
                  <TD className="text-xs tabular-nums">{category.services_count ?? 0}</TD>
                  <TD className="hidden text-xs tabular-nums lg:table-cell">{category.sort_order}</TD>
                  <TD>
                    <Pill tone={category.is_active ? "success" : "neutral"}>
                      {category.is_active ? "Active" : "Hidden"}
                    </Pill>
                  </TD>
                  {mayManage ? (
                    <TD>
                      <details>
                        <summary className="cursor-pointer text-xs font-medium text-admin-accent hover:underline">
                          Edit
                        </summary>
                        <div className="mt-4 w-[min(36rem,80vw)] rounded-lg border border-admin-border bg-admin-surface/40 px-4 py-4">
                          <CategoryForm category={category} />
                          <div className="mt-5 border-t border-admin-border pt-4">
                            <DeleteCategoryForm id={category.id} name={category.name} />
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
    </div>
  );
}
